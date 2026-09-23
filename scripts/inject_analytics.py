"""
Writes the analytics tag into the page at publish time.

The site code is not secret, but keeping it out of the repository is what makes
analytics off by default for anyone who clones or forks this: no secret, no tag.

Both workflows that publish the site run this, so the published page cannot
differ depending on which one happened to build it.
"""

import html
import os
import sys

PAGE = "frontend/index.html"
MARKER = "<!--WEB_ANALYTICS-->"


def main() -> int:
    code = (os.environ.get("GOATCOUNTER_CODE") or "").strip()

    with open(PAGE) as fh:
        page = fh.read()

    if not code:
        print("GOATCOUNTER_CODE is not set: publishing with no analytics script.")
        return 0

    if MARKER not in page:
        print(f"Expected marker {MARKER} in {PAGE}", file=sys.stderr)
        return 1

    # accept either a bare site code or a full counter endpoint
    endpoint = code if "://" in code else f"https://{code}.goatcounter.com/count"
    tag = (
        '<script data-goatcounter="%s" async src="https://gc.zgo.at/count.js"></script>'
        % html.escape(endpoint, quote=True)
    )

    with open(PAGE, "w") as fh:
        fh.write(page.replace(MARKER, tag))
    print("GoatCounter analytics injected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
