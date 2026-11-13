#!/usr/bin/env python3
"""Deterministic v0.29 static package derived only from the frozen v0.28 HTML."""
import argparse
import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BASE = ROOT / 'app/quiet-banking-v0.28'
BASE_HASH = 'f1255a2caf4b66b5ceb7220571259cc9f5bc36aa5f4203f34f11a592b9abecd2'
TYPES = {'index.html': 'text/html', 'manifest.webmanifest': 'application/manifest+json',
         'icon-180.png': 'image/png', 'icon-192.png': 'image/png', 'icon-512.png': 'image/png'}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def generate(output, tag='v0.29'):
    raw = (BASE / 'index.html').read_bytes()
    assert digest(raw) == BASE_HASH, 'Preserved baseline changed'
    client = (HERE / 'client.template.js').read_text()
    worker = (HERE / 'worker.template.js').read_text()
    html = raw.decode('utf-8')
    # Only visible branding, NOT policy disclosure or financial-script version comments.
    for old, new in [('Investment Tracker v0.28', 'Investment Tracker v0.29'),
                     ('QUIET BANKING v0.28', 'QUIET BANKING v0.29')]:
        assert html.count(old) == 1
        html = html.replace(old, new)
    old = '<button id="pwa-retry" type="button" class="textbutton">Retry/check offline files</button>'
    assert html.count(old) == 1
    html = html.replace(old, '<button id="pwa-retry" type="button" class="textbutton">Verify offline status</button> '
                        '<button id="pwa-update" type="button" class="textbutton">Check for updates</button> '
                        '<button id="pwa-repair" type="button" class="textbutton">Repair offline files</button>'
                        '<p id="pwa-update-status" role="status" data-state="idle" style="overflow-wrap:anywhere">Update discovery has not run.</p>')
    html, n = re.subn(r'(<script id="quiet-banking-pwa-client">)[\s\S]*?(</script>)', lambda m: m[1]+'\n'+client+m[2], html)
    assert n == 1
    html, n = re.subn(r'(<meta name="quiet-banking-build" content=")[^"]+("\s*>)', r'\g<1>__BUILD__\2', html)
    assert n == 1
    # Build identity covers normalized complete HTML, worker source, tag, and copied bytes.
    material = html.encode()+worker.encode()+tag.encode()
    copied = {name: (BASE/name).read_bytes() for name in TYPES if name != 'index.html'}
    for name, data in copied.items():
        material += name.encode()+data
    build_id = digest(material)[:24]
    assets = {'index.html': html.replace('__BUILD__', build_id).encode(), **copied}
    config = {'id': build_id, 'assets': [{'path': name, 'sha256': digest(data), 'size': len(data), 'type': TYPES[name]} for name, data in assets.items()]}
    assets['sw.js'] = worker.replace('__CONFIG__', json.dumps(config, sort_keys=True, separators=(',', ':'))).encode()
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    for name, data in assets.items():
        (output/name).write_bytes(data)
    return {'build': build_id, 'assets': {name: digest(data) for name, data in assets.items()}}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT/'app/quiet-banking-v0.29')
    parser.add_argument('--tag', default='v0.29')
    args = parser.parse_args()
    print(json.dumps(generate(args.output, args.tag), sort_keys=True, indent=2))
