# DEEPRUST - Local Deepfake Detection System

DEEPRUST is a privacy-first, local-only deepfake detection system. It uses advanced machine learning models (Vision Transformers and Wav2Vec2) to identify AI-generated manipulations in images and audio files without ever sending your data to a cloud API.

## Features

- **100% Local**: All processing happens on your machine.
- **Privacy Focused**: No data leaves your system (except to download models).
- **Multi-Model Support**: Choose from various state-of-the-art models from Hugging Face.
- **Cross-Platform**: Works on Windows, Linux, and macOS (supports CUDA and MPS acceleration).

---

## Installation

1. **Clone/Download** this repository to your local machine.
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Initialize Models**:
   On first run, download the default pretrained models:
   ```bash
   python main.py init
   ```

---

## Usage

DEEPRUST can be used via the **Local Web UI** or the **CLI**.

### 1. Launch the Web UI (Recommended)
Start the local server and open your browser:
```bash
python main.py serve
```
Then navigate to `http://127.0.0.1:8070`.

### 2. CLI Scan
Scan files directly from your terminal:
```bash
python main.py scan path/to/image.jpg
```

### 3. Scan an Audio File
```bash
python main.py scan path/to/audio.wav
```

### 4. List Available Models
See which models are currently supported:
```bash
python main.py list
```

### 5. Use a Specific Model
```bash
python main.py scan path/to/file.jpg -m dima806
```

---

## Supported Models

### Image Detection
| Key | Model ID | Description |
|---|---|---|
| `vit-v2` | `prithivMLmods/Deep-Fake-Detector-v2-Model` | **Default.** Vision Transformer v2. |
| `umm-maybe` | `umm-maybe/AI-image-detector` | High-quality community detector. |
| `dima806` | `dima806/ai_vs_real_image_detection` | Efficient binary classifier. |

### Audio Detection
| Key | Model ID | Description |
|---|---|---|
| `wav2vec2` | `mo-thecreator/Deepfake-audio-detection` | **Default.** Fine-tuned for speech forensics. |
| `melody-v2` | `MelodyMachine/Deepfake-audio-detection-V2` | Advanced audio forensic analysis. |

---

## How It Works

1. **First Run**: When you run `python main.py init`, the system uses the `transformers` library to download the models from Hugging Face and saves them in a local `models/` folder.
2. **Inference**: When you scan a file, DEEPRUST loads the model onto your hardware (GPU if available, otherwise CPU) and performs a classification.
3. **Results**: You receive a confidence score and a binary 'REAL' or 'FAKE' result along with detailed label probabilities.

---

## Configuration

You can customize behavior via a `.env` file:
- `MODEL_CACHE_DIR`: Change where models are stored (default: `./models`).
- `LOG_LEVEL`: Change logging verbosity (INFO, DEBUG, WARNING).
