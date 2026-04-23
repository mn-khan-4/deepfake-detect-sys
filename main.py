#!/usr/bin/env python3
"""
DEEPRUST - Local Deepfake Detection System
A privacy-focused tool with a beautiful local-only web interface.
"""

import argparse
import io
import json
import logging
import os
import sys
import time
import warnings
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

# Suppress noise
warnings.filterwarnings("ignore", category=UserWarning)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

import colorama
import librosa
import numpy as np
import torch
from colorama import Fore, Style
from dotenv import load_dotenv
from PIL import Image
from tqdm import tqdm
from transformers import pipeline

# FastAPI imports
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

load_dotenv()
colorama.init(autoreset=True)

# Configuration
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "models"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("deeprust")

# Model Catalog
MODEL_CATALOG = {
    "image": {
        "vit-v2": {
            "id": "prithivMLmods/Deep-Fake-Detector-v2-Model",
            "task": "image-classification",
            "desc": "Vision Transformer v2 - High accuracy across diverse datasets.",
        },
        "siglip2": {
            "id": "prithivMLmods/Deepfake-Detect-Siglip2",
            "task": "image-classification",
            "desc": "Next-gen SigLIP-based detector.",
        }
    },
    "audio": {
        "wav2vec2": {
            "id": "mo-thecreator/Deepfake-audio-detection",
            "task": "audio-classification",
            "desc": "Fine-tuned Wav2Vec2 for synthetic speech detection.",
        },
        "melody-v2": {
            "id": "MelodyMachine/Deepfake-audio-detection-V2",
            "task": "audio-classification",
            "desc": "Advanced audio forensic model.",
        }
    },
}

DEFAULT_IMAGE_MODEL = "vit-v2"
DEFAULT_AUDIO_MODEL = "wav2vec2"


class ModelManager:
    def __init__(self):
        self.image_pipe = None
        self.audio_pipe = None
        self.current_image_id = None
        self.current_audio_id = None
        MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def _get_device(self):
        if torch.cuda.is_available(): return 0
        if torch.backends.mps.is_available(): return "mps"
        return -1

    def load_model(self, model_type: str, model_key: str = None):
        catalog = MODEL_CATALOG.get(model_type, {})
        key = model_key or (DEFAULT_IMAGE_MODEL if model_type == "image" else DEFAULT_AUDIO_MODEL)
        
        if key not in catalog:
            key = list(catalog.keys())[0] if catalog else None
            
        if not key: return None

        model_info = catalog[key]
        model_id = model_info["id"]
        task = model_info["task"]
        
        log.info(f"Loading {model_type} model: {model_id}...")
        
        try:
            pipe = pipeline(
                task,
                model=model_id,
                device=self._get_device(),
                model_kwargs={"cache_dir": str(MODEL_CACHE_DIR)}
            )
            
            if model_type == "image":
                self.image_pipe = pipe
                self.current_image_id = model_id
            else:
                self.audio_pipe = pipe
                self.current_audio_id = model_id
                
            return model_id
        except Exception as e:
            log.error(f"Error loading {model_id}: {e}")
            return None

    def predict_image(self, image_data):
        if not self.image_pipe: self.load_model("image")
        
        if isinstance(image_data, bytes):
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
        else:
            image = Image.open(image_data).convert("RGB")

        outputs = self.image_pipe(image)
        return self._format_response(outputs, self.current_image_id)

    def predict_audio(self, audio_data):
        if not self.audio_pipe: self.load_model("audio")
        
        if isinstance(audio_data, bytes):
            waveform, sample_rate = librosa.load(io.BytesIO(audio_data), sr=16000, mono=True)
        else:
            waveform, sample_rate = librosa.load(audio_data, sr=16000, mono=True)

        outputs = self.audio_pipe({"array": waveform, "sampling_rate": sample_rate})
        return self._format_response(outputs, self.current_audio_id)

    def _format_response(self, outputs, model_id):
        sorted_outputs = sorted(outputs, key=lambda x: x["score"], reverse=True)
        top = sorted_outputs[0]
        label = top["label"].lower()
        score = top["score"]
        
        ai_keywords = ["fake", "ai", "synthetic", "generated", "spoof", "label_0"]
        is_ai = any(word in label for word in ai_keywords)
        
        # Prepare dict for web response
        details = {
            "model": model_id,
            "top_label": label,
        }
        for item in sorted_outputs:
            details[item["label"]] = f"{item['score']*100:.1f}%"

        return {
            "success": True,
            "result": "fake" if is_ai else "real",
            "confidence": round(score * 100, 1),
            "details": details
        }


mgr = ModelManager()

# ===========================================================================
# WEB SERVER LOGIC
# ===========================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting DEEPRUST Local Server")
    log.info(f"Model cache: {MODEL_CACHE_DIR.resolve()}")
    # Warmup models in background
    try:
        await run_in_threadpool(mgr.load_model, "image")
        await run_in_threadpool(mgr.load_model, "audio")
    except:
        log.warning("Warmup failed, will load on first scan.")
    yield
    log.info("Shuting down")

app = FastAPI(title="DEEPRUST", lifespan=lifespan)

# Setup static/templates
if Path("static").exists():
    app.mount("/static", StaticFiles(directory="static"), name="static")
else:
    log.error("Static directory not found!")

templates = Jinja2Templates(directory="templates")

# Custom url_for to handle static/page routing simply
def _url_for(name: str, **kwargs) -> str:
    if name == "static":
        return f"/static/{kwargs.get('filename', '')}"
    routes = {
        "landing": "/home",
        "image_scan": "/image-scan",
        "audio_scan": "/audio-scan"
    }
    return routes.get(name, f"/{name}")

templates.env.globals["url_for"] = _url_for

@app.get("/")
async def root():
    return RedirectResponse(url="/home")

@app.get("/home")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/image-scan")
async def image_page(request: Request):
    return templates.TemplateResponse("image_scan.html", {"request": request})

@app.get("/audio-scan")
async def audio_page(request: Request):
    return templates.TemplateResponse("audio_scan.html", {"request": request})

@app.post("/scan/image")
async def scan_image(file: UploadFile = File(...)):
    try:
        data = await file.read()
        result = await run_in_threadpool(mgr.predict_image, data)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.post("/scan/audio")
async def scan_audio(file: UploadFile = File(...)):
    try:
        data = await file.read()
        result = await run_in_threadpool(mgr.predict_audio, data)
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


# ===========================================================================
# CLI LOGIC
# ===========================================================================

def run_cli():
    parser = argparse.ArgumentParser(description="DEEPRUST - Local Deepfake Detector")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("init", help="Download models for offline use")
    subparsers.add_parser("list", help="List available models")
    
    scan_parser = subparsers.add_parser("scan", help="Scan a file")
    scan_parser.add_argument("path", help="File path")
    scan_parser.add_argument("-t", "--type", choices=["image", "audio", "auto"], default="auto")

    # Serve command (Default)
    serve_parser = subparsers.add_parser("serve", help="Start the local web UI")
    serve_parser.add_argument("--port", type=int, default=8070)

    args = parser.parse_args()
    
    # If no command or "serve", start the web server
    if not args.command or args.command == "serve":
        import uvicorn
        port = getattr(args, "port", 8070)
        print(f"{Fore.CYAN}Starting DEEPRUST Web UI at {Fore.WHITE}http://127.0.0.1:{port}")
        uvicorn.run(app, host="127.0.0.1", port=port)
        return

    if args.command == "init":
        mgr.load_model("image")
        mgr.load_model("audio")
        print(f"{Fore.GREEN}Models initialized.")
        
    elif args.command == "list":
        for cat, models in MODEL_CATALOG.items():
            print(f"\n{cat.upper()} MODELS:")
            for k, v in models.items():
                print(f"  {k:<10} -> {v['id']}")
                
    elif args.command == "scan":
        path = args.path
        kind = args.type
        if kind == "auto":
            ext = Path(path).suffix.lower()
            kind = "image" if ext in ['.jpg', '.jpeg', '.png', '.webp'] else "audio"
        
        if kind == "image":
            res = mgr.predict_image(path)
        else:
            res = mgr.predict_audio(path)
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    run_cli()
