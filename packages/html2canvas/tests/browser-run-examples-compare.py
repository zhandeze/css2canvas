import json

module_version = "miniapp-sanitized-v2"

examples = [
    {
        "name": "demo",
        "url": "http://127.0.0.1:8090/examples/demo.html",
        "options": {"selector": "body"},
    },
    {
        "name": "demo2",
        "url": "http://127.0.0.1:8090/examples/demo2.html",
        "options": {"selector": "body"},
    },
    {
        "name": "existing_canvas",
        "url": "http://127.0.0.1:8090/examples/existing_canvas.html",
        "options": {"selector": "#content", "canvasSelector": "canvas", "scale": 1},
        "before": """
const button = document.querySelector('button');
if (!button) throw new Error('button missing');
button.click();
""",
    },
]

results = []

for example in examples:
    new_tab(example["url"])
    wait_for_load()
    script = """
(async () => {
  delete window.extractedCanvasRendererBrowser;
  if (!window.extractedCanvasRendererBrowser) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/build/extracted-canvas-renderer-browser.js?v=' + MODULE_VERSION;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('helper load failed'));
      document.head.appendChild(s);
    });
  }
  PREPARE_HOOK
  const options = OPTIONS_VALUE;
  const compare = await window.extractedCanvasRendererBrowser.renderOriginalAndExtracted(options);
  const input = await window.extractedCanvasRendererBrowser.exportRenderInput(options);
  return {compare: compare.compare, input};
})()
"""
    prepare_hook = example.get("before", "")
    script = script.replace("PREPARE_HOOK", prepare_hook)
    script = script.replace("OPTIONS_VALUE", json.dumps(example["options"]))
    script = script.replace("MODULE_VERSION", json.dumps(module_version))
    result = js(script)
    results.append({"name": example["name"], **result})

print(json.dumps(results))
