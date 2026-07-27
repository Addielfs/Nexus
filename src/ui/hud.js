import { PLAYER } from "../utils/constants.js";

export class HUD {
  constructor() {
    this.elements = {};
    this._cacheElements();
    this._messageTimeout = null;
    this._lastMonsterAlert = 0;
  }

  _cacheElements() {
    const ids = [
      "hud-hp-fill", "hud-hp-text",
      "hud-lives-fill", "hud-lives-text",
      "hud-battery-fill", "hud-battery-text",
      "hud-energy-fill", "hud-energy-text",
      "hud-ammo", "hud-ammo-count",
      "hud-pieces-found", "hud-pieces-total", "hud-key-status",
      "hud-monster-name", "hud-monster-state", "hud-monster-count",
      "hud-log", "hud-center-msg", "hud-map-name",
      "hud-interact-hint",
    ];

    for (const id of ids) {
      this.elements[id] = document.getElementById(id);
    }
  }

  update(state) {
    this._bar("hud-hp", state.health, PLAYER.HEALTH_MAX, "#ff4466");
    this._bar("hud-battery", state.battery, PLAYER.BATTERY_MAX, "#44ffaa");
    this._bar("hud-energy", state.escapeEnergy, 100, "#44ddff");

    this._text("hud-hp-text", Math.ceil(state.health) + "%");
    this._text("hud-lives-text", state.lives + " / " + PLAYER.LIVES);
    this._text("hud-battery-text", Math.ceil(state.battery) + "%");
    this._text("hud-energy-text", Math.ceil(state.escapeEnergy) + "%");

    if (this.elements["hud-pieces-found"]) {
      this.elements["hud-pieces-found"].textContent = state.piecesFound;
    }
    if (this.elements["hud-pieces-total"]) {
      this.elements["hud-pieces-total"].textContent = "/ " + state.piecesTotal;
    }
    if (this.elements["hud-key-status"]) {
      this.elements["hud-key-status"].textContent = state.keyAssembled
        ? "✓ LLAVE LISTA"
        : "Ensamblando...";
      this.elements["hud-key-status"].style.color = state.keyAssembled
        ? "#00ffcc"
        : "#ffaa22";
    }

    this._text("hud-ammo-count", state.weaponAmmo);

    if (this.elements["hud-ammo"]) {
      this.elements["hud-ammo"].style.display = state.hasWeapon ? "flex" : "none";
    }

    if (state.monsterInfo) {
      this._text("hud-monster-name", state.monsterInfo.name);
      this._text("hud-monster-state", state.monsterInfo.state);
      this._text("hud-monster-count", state.monsterInfo.count + " activos");
    }

    if (this.elements["hud-interact-hint"]) {
      const hint = this.elements["hud-interact-hint"];
      if (state.interactHint) {
        hint.textContent = state.interactHint;
        hint.classList.add("visible");
      } else {
        hint.classList.remove("visible");
      }
    }
  }

  showMessage(text, duration = 3000) {
    const el = this.elements["hud-center-msg"];
    if (!el) return;
    el.textContent = text;
    el.classList.add("visible");
    if (this._messageTimeout) clearTimeout(this._messageTimeout);
    this._messageTimeout = setTimeout(() => {
      el.classList.remove("visible");
    }, duration);
  }

  setLog(text) {
    if (this.elements["hud-log"]) {
      this.elements["hud-log"].textContent = text;
    }
  }

  setMapName(name) {
    if (this.elements["hud-map-name"]) {
      this.elements["hud-map-name"].textContent = name;
    }
  }

  showMonsterAlert(name, state) {
    const now = Date.now();
    if (now - this._lastMonsterAlert < 5000) return;
    this._lastMonsterAlert = now;
    this.showMessage(`${name} - ${state}`, 2500);
  }

  setStartScreen(show) {
    const overlay = document.getElementById("start-overlay");
    if (overlay) {
      overlay.style.display = show ? "flex" : "none";
    }
  }

  setGameOver(show) {
    const overlay = document.getElementById("gameover-overlay");
    if (overlay) {
      overlay.style.display = show ? "flex" : "none";
    }
  }

  setVictory(show) {
    const overlay = document.getElementById("victory-overlay");
    if (overlay) {
      overlay.style.display = show ? "flex" : "none";
    }
  }

  _bar(prefix, value, max, color) {
    const fill = this.elements[prefix + "-fill"];
    if (fill) {
      const pct = Math.max(0, Math.min(100, (value / max) * 100));
      fill.style.width = pct + "%";
      fill.style.background = color;
    }
  }

  _text(id, value) {
    if (this.elements[id]) {
      this.elements[id].textContent = value;
    }
  }
}
