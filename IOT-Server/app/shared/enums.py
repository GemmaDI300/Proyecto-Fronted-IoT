from enum import Enum


class DeviceStatus(str, Enum):
    ON = "on"
    OFF = "off"
    IDLE = "idle"
