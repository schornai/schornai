"""Exercise the Python protocol without loading MLX or downloading models."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch, Mock

SOURCE = Path(__file__).resolve().parents[1] / 'apps/transcriber-mac/src/core/transcribe.py'
mlx = types.ModuleType('mlx_whisper')
mlx.transcribe = Mock()
with patch.dict(sys.modules, {'mlx_whisper': mlx}):
    spec = importlib.util.spec_from_file_location('transcribe', SOURCE)
    transcription = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(transcription)


class AudioInput:
    def __init__(self, terminal=False):
        self.buffer = io.BytesIO(b'audio bytes')
        self.terminal = terminal

    def isatty(self):
        return self.terminal


class TranscriberTest(unittest.TestCase):
    def invoke(self, arguments=None, terminal=False, as_script=False):
        output, errors = io.StringIO(), io.StringIO()
        with patch.object(sys, 'argv', [str(SOURCE), '--fileSystemIdentifier', 'model'] + (arguments or [])), \
             patch.object(sys, 'stdin', AudioInput(terminal)), \
             contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            if as_script:
                with patch.dict(sys.modules, {'mlx_whisper': mlx}):
                    runpy.run_path(str(SOURCE), run_name='__main__')
            else:
                transcription.main()
        return output.getvalue(), errors.getvalue()

    def setUp(self):
        mlx.transcribe.reset_mock()
        mlx.transcribe.side_effect = None
        mlx.transcribe.return_value = {'text': 'Hello', 'segments': [{'start': 0, 'end': 1}]}

    def test_word_timestamps_prompt_and_cleanup(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(tempfile, 'tempdir', directory):
            output, errors = self.invoke(['--wordTimestamps', '--initialPrompt', 'Vocabulary'])
            lines = output.strip().splitlines()
            self.assertEqual(lines[0], '===TRANSCRIBER_RESULT_START===')
            self.assertEqual(lines[-1], '===TRANSCRIBER_RESULT_END===')
            self.assertEqual(json.loads(lines[1]), {'transcription': 'Hello', 'segments': [{'start': 0, 'end': 1}]})
            self.assertEqual(errors, '')
            self.assertEqual(list(Path(directory).iterdir()), [])
            audio_path, = mlx.transcribe.call_args.args
            self.assertFalse(Path(audio_path).exists())
            self.assertEqual(mlx.transcribe.call_args.kwargs['initial_prompt'], 'Vocabulary')
            self.assertTrue(mlx.transcribe.call_args.kwargs['word_timestamps'])
            self.assertTrue(mlx.transcribe.call_args.kwargs['path_or_hf_repo'].endswith('/.aibox/mlx/whisper/models/model'))

    def test_plain_transcription_script_entry(self):
        output, _ = self.invoke(as_script=True)
        self.assertEqual(json.loads(output.splitlines()[1]), {'transcription': 'Hello'})
        self.assertNotIn('initial_prompt', mlx.transcribe.call_args.kwargs)
        self.assertFalse(mlx.transcribe.call_args.kwargs['word_timestamps'])

    def test_absent_segments(self):
        mlx.transcribe.return_value = {'text': 'Hello'}
        output, _ = self.invoke(['--wordTimestamps'])
        self.assertEqual(json.loads(output.splitlines()[1])['segments'], [])

    def test_model_failure_cleans_temporary_audio(self):
        mlx.transcribe.side_effect = RuntimeError('model failed')
        with tempfile.TemporaryDirectory() as directory, patch.object(tempfile, 'tempdir', directory):
            errors = io.StringIO()
            with contextlib.redirect_stderr(errors), self.assertRaises(SystemExit) as raised:
                self.invoke()
            self.assertEqual(raised.exception.code, 1)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_interactive_stdin_rejected(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(tempfile, 'tempdir', directory):
            with self.assertRaises(SystemExit) as raised:
                self.invoke(terminal=True)
            self.assertEqual(raised.exception.code, 1)
            mlx.transcribe.assert_not_called()
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_model_path_traversal_rejected(self):
        for identifier in ['../secret', '/etc/passwd', '..', 'model/subdir', 'model\\subdir']:
            with self.subTest(identifier=identifier), self.assertRaises(SystemExit):
                self.invoke(['--fileSystemIdentifier', identifier])
            mlx.transcribe.assert_not_called()

    def test_model_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            models = Path(directory) / '.aibox/mlx/whisper/models'
            models.mkdir(parents=True)
            (models / 'model').symlink_to(Path(directory))
            with patch.object(transcription.os.path, 'expanduser', return_value=directory), self.assertRaises(SystemExit):
                self.invoke()
            mlx.transcribe.assert_not_called()

    def test_three_retry_levels_and_legacy_default(self):
        for level, attempts in [('fast', 1), ('balanced', 3), ('thorough', 6)]:
            with self.subTest(level=level):
                self.invoke(['--retryLevel', level])
                temperatures = mlx.transcribe.call_args.kwargs['temperature']
                self.assertEqual(len(temperatures), attempts)
                self.assertEqual(temperatures[0], 0.0)
        self.invoke()
        self.assertEqual(len(mlx.transcribe.call_args.kwargs['temperature']), 6)

    def test_server_handles_multiple_jobs_without_prompt_leakage(self):
        requests = [
            {'id': 'one', 'audioPath': '/tmp/one', 'modelIdentifier': 'first', 'modelPrompt': 'Names', 'retryLevel': 'balanced'},
            {'id': 'two', 'audioPath': '/tmp/two', 'modelIdentifier': 'second'},
        ]
        output = io.StringIO()
        def recognize(*args, **kwargs):
            print('library diagnostic')
            return {'text': 'Hello', 'segments': []}
        mlx.transcribe.side_effect = recognize
        with patch.object(sys, 'argv', [str(SOURCE), '--serve']), \
             patch.object(sys, 'stdin', io.StringIO(''.join(json.dumps(r) + '\n' for r in requests))), \
             contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()):
            transcription.main()
        responses = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([r['id'] for r in responses], ['one', 'two'])
        first, second = mlx.transcribe.call_args_list
        self.assertEqual(first.kwargs['initial_prompt'], 'Names')
        self.assertEqual(len(first.kwargs['temperature']), 3)
        self.assertNotIn('initial_prompt', second.kwargs)
        self.assertTrue(second.kwargs['path_or_hf_repo'].endswith('/second'))
        self.assertEqual(len(second.kwargs['temperature']), 6)

    def test_server_reports_safe_errors_and_continues(self):
        requests = [{'id': str(i), 'audioPath': '/tmp/audio', 'modelIdentifier': 'model'} for i in range(2)]
        mlx.transcribe.side_effect = [RuntimeError('private audio or secret'), {'text': 'OK', 'segments': []}]
        output = io.StringIO()
        with patch.object(sys, 'stdin', io.StringIO(''.join(json.dumps(r) + '\n' for r in requests))), contextlib.redirect_stdout(output):
            transcription.serve()
        first, second = map(json.loads, output.getvalue().splitlines())
        self.assertIn('RuntimeError', first['error'])
        self.assertNotIn('private audio', first['error'])
        self.assertEqual(second['result']['transcription'], 'OK')


    def test_invalid_options_rejected_before_loading_model(self):
        for options in [dict(model_identifier=None), dict(model_identifier=42),
                        dict(model_identifier="a" * 129), dict(retry_level="unknown"),
                        dict(initial_prompt=42)]:
            arguments = dict(audio_path="/tmp/audio", model_identifier="model")
            arguments.update(options)
            with self.subTest(options=options), self.assertRaises(ValueError):
                transcription.transcribe(**arguments)
            mlx.transcribe.assert_not_called()

    def test_custom_home_and_empty_prompt(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(transcription.os.environ, {"SCHORNAI_HOME": directory}):
            result = transcription.transcribe("/tmp/audio", "model", initial_prompt="")
            self.assertEqual(result["transcription"], "Hello")
            self.assertEqual(mlx.transcribe.call_args.kwargs["path_or_hf_repo"], str(Path(directory).resolve() / "mlx/whisper/models/model"))
            self.assertNotIn("initial_prompt", mlx.transcribe.call_args.kwargs)

    def test_missing_cli_model_exits_before_reading_audio(self):
        with patch.object(sys, "argv", [str(SOURCE)]), contextlib.redirect_stderr(io.StringIO()) as errors:
            with self.assertRaises(SystemExit) as raised:
                transcription.main()
        self.assertEqual(raised.exception.code, 2)
        self.assertIn("--fileSystemIdentifier is required", errors.getvalue())
        mlx.transcribe.assert_not_called()

    def test_server_recovers_from_invalid_json_and_incomplete_requests(self):
        lines = ['{broken', '{}', '{"id":"missing-audio"}', json.dumps({"id": "valid", "audioPath": "/tmp/audio", "modelIdentifier": "model"})]
        output = io.StringIO()
        with patch.object(sys, "stdin", io.StringIO("\n".join(lines))), contextlib.redirect_stdout(output):
            transcription.serve()
        responses = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([r["id"] for r in responses], [None, None, "missing-audio", "valid"])
        self.assertIn("JSONDecodeError", responses[0]["error"])
        self.assertIn("KeyError", responses[1]["error"])
        self.assertIn("KeyError", responses[2]["error"])
        self.assertEqual(responses[3]["result"]["transcription"], "Hello")
        mlx.transcribe.assert_called_once()


if __name__ == '__main__':
    unittest.main()
