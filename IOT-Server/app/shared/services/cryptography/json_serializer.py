import json
from typing import Any
from app.shared.services.cryptography.base import ISerializer


class JsonSerializer(ISerializer):
    def serialize(self, obj: dict[str, Any]) -> str:
        return json.dumps(obj, ensure_ascii=False)

    def deserialize(self, raw: str) -> dict[str, Any]:
        return json.loads(raw)
