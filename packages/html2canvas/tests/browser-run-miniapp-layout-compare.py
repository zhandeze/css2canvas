import json

module_version = "miniapp-sanitized-v2"

examples = [
    {
        "name": "layout-text-block",
        "options": {"scale": 1},
    },
]

results = []

for example in examples:
    new_tab("http://127.0.0.1:8090/tests/miniapp-layout-compare.html")
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
  const result = await window.extractedCanvasRendererBrowser.renderMiniAppLayoutCompare(OPTIONS_VALUE);
  return result;
})()
"""
    script = script.replace("OPTIONS_VALUE", json.dumps(example["options"]))
    script = script.replace("MODULE_VERSION", json.dumps(module_version))
    result = js(script)
    results.append({"name": example["name"], **result})

print(json.dumps(results))
