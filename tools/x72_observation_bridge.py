#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read one state ObservationEnvelope through Antmux X72ObservationAdapter."
    )
    parser.add_argument("--antmux-root", required=True)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--mode", choices=("state",), default="state")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    antmux_root = Path(args.antmux_root).expanduser().resolve()
    adapter_root = antmux_root / "deploy" / "x72-shared-queen"

    if not adapter_root.is_dir():
        raise SystemExit("ANTMUX_ADAPTER_ROOT_NOT_FOUND")

    sys.path.insert(0, str(adapter_root))

    from observation_adapter import X72ObservationAdapter

    adapter = X72ObservationAdapter(args.base_url)
    envelope = adapter.read_state()

    print(
        json.dumps(
            envelope.to_dict(),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
