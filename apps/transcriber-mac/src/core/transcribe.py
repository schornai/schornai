import argparse
import contextlib
import json
import os
import re
import shutil
import sys
import tempfile

import mlx_whisper

RETRY_TEMPERATURES = {
    "fast": (0.0,),
    "balanced": (0.0, 0.2, 0.4),
    "thorough": (0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
}


def transcribe(audio_path, model_identifier, word_timestamps=True,
               initial_prompt=None, retry_level="thorough"):
    if not isinstance(model_identifier, str) or not re.fullmatch(
        r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", model_identifier
    ):
        raise ValueError("Invalid model identifier")
    if retry_level not in RETRY_TEMPERATURES:
        raise ValueError("Invalid retry level")
    if initial_prompt is not None and not isinstance(initial_prompt, str):
        raise ValueError("Invalid initial prompt")
    box_dir = os.environ.get("SCHORNAI_HOME", os.path.join(os.path.expanduser("~"), ".aibox"))
    models_dir = os.path.realpath(os.path.join(box_dir, "mlx", "whisper", "models"))
    model_path = os.path.realpath(os.path.join(models_dir, model_identifier))
    if os.path.commonpath([models_dir, model_path]) != models_dir:
        raise ValueError("Model path is outside the configured model directory")
    kwargs = {
        "path_or_hf_repo": model_path,
        "word_timestamps": word_timestamps,
        "temperature": RETRY_TEMPERATURES[retry_level],
        "verbose": None,
    }
    if initial_prompt:
        kwargs["initial_prompt"] = initial_prompt
    # Keep stdout exclusively for protocol responses. ModelHolder in mlx_whisper
    # caches the last model in this process; prompts/decoding state stay per call.
    with contextlib.redirect_stdout(sys.stderr):
        result = mlx_whisper.transcribe(audio_path, **kwargs)
    response = {"transcription": result["text"]}
    if word_timestamps:
        response["segments"] = result.get("segments", [])
    return response


def serve():
    for line in sys.stdin:
        request_id = None
        try:
            request = json.loads(line)
            request_id = request["id"]
            result = transcribe(
                request["audioPath"], request["modelIdentifier"],
                initial_prompt=request.get("modelPrompt"),
                retry_level=request.get("retryLevel", "thorough"),
            )
            response = {"id": request_id, "result": result}
        except Exception as error:
            # Never forward exception details that may contain paths or audio text.
            response = {"id": request_id, "error": f"Transcription failed ({type(error).__name__}). Check the model files and audio format."}
        print(json.dumps(response), flush=True)


def main():
    parser = argparse.ArgumentParser(description="MLX-Whisper transcription via stdin/stdout")
    parser.add_argument("--serve", action="store_true", help="Process JSON requests until stdin closes")
    parser.add_argument("--fileSystemIdentifier", help="Model identifier")
    parser.add_argument("--wordTimestamps", action="store_true")
    parser.add_argument("--initialPrompt", type=str)
    parser.add_argument("--retryLevel", choices=RETRY_TEMPERATURES, default="thorough")
    args = parser.parse_args()
    if args.serve:
        serve()
        return
    if not args.fileSystemIdentifier:
        parser.error("--fileSystemIdentifier is required without --serve")
    temp_audio_path = None
    try:
        if sys.stdin.isatty():
            raise ValueError("Audio data must be provided via stdin")
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            temp_audio_path = temp_audio.name
            shutil.copyfileobj(sys.stdin.buffer, temp_audio)
        response = transcribe(temp_audio_path, args.fileSystemIdentifier,
                              args.wordTimestamps, args.initialPrompt, args.retryLevel)
        print("===TRANSCRIBER_RESULT_START===")
        print(json.dumps(response))
        print("===TRANSCRIBER_RESULT_END===")
    except Exception as error:
        print(json.dumps({"error": f"Transcription failed ({type(error).__name__})."}), file=sys.stderr)
        sys.exit(1)
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


if __name__ == "__main__":
    main()
