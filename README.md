# flas-ai.github.io

Project page for **FLAS — Flow-based Activation Steering** ([paper](https://arxiv.org/abs/2605.05892), [code](https://github.com/flas-ai/FLAS), [demo](https://huggingface.co/spaces/Lunamos/flas-demo)).

Pure HTML / CSS / vanilla-JS — no build step. Plotly + KaTeX via CDN.

## Layout

```
index.html           # all content + section markup
css/site.css         # one stylesheet, no preprocessor
js/
  trajectory.js      # 3D Plotly viewer (FlowTime slider)
  studio.js          # FlowTime Studio widget
  curves.js          # per-dose C/I/F/HMean Plotly line plot
data/
  trajectories.json  # output of FLAS/scripts/export_trajectories_for_web.py
  eval.json          # output of FLAS/scripts/export_eval_for_web.py
assets/main.png      # hero figure (copied from FLAS/figs/main.png)
```

## Refreshing the data

Both `data/*.json` files are produced by scripts in the
[main FLAS repo](https://github.com/flas-ai/FLAS):

```bash
# in the FLAS checkout
uv run python scripts/export_trajectories_for_web.py \
    --flow-ckpt checkpoints/flas-gemma-2-2b-it-n10/best_step68858_val1.2476.pt \
    --out ../flas-ai.github.io/data/trajectories.json   # ~10-15 min on a single GPU

uv run python scripts/export_eval_for_web.py \
    --judged results/base_2b/judged.json \
    --out ../flas-ai.github.io/data/eval.json           # CPU-only, instant
```

`trajectories.json` is initially a placeholder (`scripts/_placeholder_trajectories.py`)
so the page renders before the GPU job finishes — overwrite it with the real
output when ready.

## Local preview

```bash
cd /path/to/flas-ai.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

GitHub Pages serves directly from `main`. Just push.

## License

Apache 2.0.
