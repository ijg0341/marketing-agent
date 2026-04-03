from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel
from pydantic_settings import BaseSettings


CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///./data/marketing_agent.db"

    # Twitter/X
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    twitter_access_token: str = ""
    twitter_access_secret: str = ""
    twitter_bearer_token: str = ""

    # Instagram
    instagram_access_token: str = ""
    instagram_business_account_id: str = ""

    # Facebook
    facebook_page_access_token: str = ""
    facebook_page_id: str = ""

    # Blog
    wordpress_url: str = ""
    wordpress_username: str = ""
    wordpress_app_password: str = ""

    # Email
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


def load_yaml(filename: str) -> dict[str, Any]:
    path = CONFIG_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_yaml(filename: str, data: dict[str, Any]) -> None:
    path = CONFIG_DIR / filename
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)


class AgentConfig:
    def __init__(self) -> None:
        self._agent = load_yaml("agent.yaml")
        self._channels = load_yaml("channels.yaml")
        self._strategy = load_yaml("strategy.yaml")

    @property
    def product(self) -> dict[str, Any]:
        return self._agent.get("product", {})

    @property
    def brand(self) -> dict[str, Any]:
        return self._agent.get("brand", {})

    @property
    def target_audience(self) -> dict[str, Any]:
        return self._agent.get("target_audience", {})

    @property
    def channels(self) -> dict[str, Any]:
        return self._channels

    @property
    def strategy(self) -> dict[str, Any]:
        return self._strategy

    def get_enabled_channels(self) -> list[str]:
        return [name for name, cfg in self._channels.items() if cfg.get("enabled")]

    def reload_strategy(self) -> dict[str, Any]:
        self._strategy = load_yaml("strategy.yaml")
        return self._strategy

    def update_strategy(self, updates: dict[str, Any]) -> dict[str, Any]:
        self._strategy.update(updates)
        save_yaml("strategy.yaml", self._strategy)
        return self._strategy


settings = Settings()
agent_config = AgentConfig()
