import * as THREE from "three";
import { MAZE, PLAYER, COMBAT, ITEMS, MAP_NAMES } from "./utils/constants.js";
import { rand, randi, pick } from "./utils/math.js";
import { Renderer } from "./systems/renderer.js";
import { Maze } from "./entities/maze.js";
import { Player } from "./entities/player.js";
import { MonsterManager } from "./entities/monsters.js";
import { ItemManager } from "./entities/items.js";
import { Combat } from "./systems/combat.js";
import { HUD } from "./ui/hud.js";
import { Audio } from "./audio/audio.js";
import { ParticleSystem } from "./systems/particles.js";

export class Game {
  constructor() {
    this.running = false;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;

    this.renderer = null;
    this.maze = null;
    this.player = null;
    this.monsterMgr = null;
    this.itemMgr = null;
    this.combat = null;
    this.hud = null;
    this.audio = null;
    this.particles = null;

    this.mapName = "";
    this.lastTime = 0;
    this.footstepTimer = 0;
    this.monsterNearTimer = 0;
    this.nearestMonsterDist = Infinity;

    this._boundAnimate = this._animate.bind(this);
  }

  async init() {
    const container = document.getElementById("game");
    this.renderer = new Renderer(container);
    this.maze = new Maze();
    this.player = new Player(this.maze);
    this.monsterMgr = new MonsterManager(this.maze);
    this.itemMgr = new ItemManager(this.maze);
    this.combat = new Combat(this.renderer.camera, this.renderer.scene);
    this.hud = new HUD();
    this.audio = new Audio();
    this.particles = new ParticleSystem(this.renderer.scene);

    this._bindEvents();
    this.hud.setStartScreen(true);
    this.hud.setGameOver(false);
    this.hud.setVictory(false);
  }

  _bindEvents() {
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const victoryBtn = document.getElementById("victory-btn");

    if (startBtn) startBtn.addEventListener("click", () => this.start());
    if (restartBtn) restartBtn.addEventListener("click", () => this.restart());
    if (victoryBtn) victoryBtn.addEventListener("click", () => this.restart());

    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r" && (this.gameOver || this.victory)) {
        this.restart();
      }
    });

    this._initMobileControls();
  }

  _initMobileControls() {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);

    if (!isMobile) return;

    const shootBtn = document.getElementById("btn-shoot");
    const interactBtn = document.getElementById("btn-interact");
    const flashBtn = document.getElementById("btn-flash");
    const joystickArea = document.getElementById("joystick-area");
    const joystickKnob = document.getElementById("joystick-knob");

    if (shootBtn) {
      shootBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.player.mouseButtons.left = true;
      }, { passive: false });
      shootBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.player.mouseButtons.left = false;
      }, { passive: false });
    }

    if (interactBtn) {
      interactBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.player.triggerInteract();
      }, { passive: false });
    }

    if (flashBtn) {
      flashBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.player.flashlightOn = !this.player.flashlightOn;
      }, { passive: false });
    }

    const sprintBtn = document.getElementById("btn-sprint");
    if (sprintBtn) {
      sprintBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.player.keys["shift"] = true;
      }, { passive: false });
      sprintBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.player.keys["shift"] = false;
      }, { passive: false });
    }

    if (joystickArea && joystickKnob) {
      let joystickTouchId = null;
      let joystickCenter = { x: 0, y: 0 };
      const maxDist = 50;

      joystickArea.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        const rect = joystickArea.getBoundingClientRect();
        joystickCenter.x = rect.left + rect.width / 2;
        joystickCenter.y = rect.top + rect.height / 2;
      }, { passive: false });

      joystickArea.addEventListener("touchmove", (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (const touch of e.changedTouches) {
          if (touch.identifier === joystickTouchId) {
            let dx = touch.clientX - joystickCenter.x;
            let dy = touch.clientY - joystickCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDist) {
              dx = (dx / dist) * maxDist;
              dy = (dy / dist) * maxDist;
            }
            joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
            this.player.touchMove.x = dx / maxDist;
            this.player.touchMove.y = dy / maxDist;
          }
        }
      }, { passive: false });

      const resetJoystick = (e) => {
        e.preventDefault();
        for (const touch of e.changedTouches) {
          if (touch.identifier === joystickTouchId) {
            joystickTouchId = null;
            joystickKnob.style.transform = "translate(0px, 0px)";
            this.player.touchMove.x = 0;
            this.player.touchMove.y = 0;
          }
        }
      };
      joystickArea.addEventListener("touchend", resetJoystick, { passive: false });
      joystickArea.addEventListener("touchcancel", resetJoystick, { passive: false });
    }
  }

  start() {
    this.audio.init();
    this.audio.resume();

    this.hud.setStartScreen(false);
    this.hud.setGameOver(false);
    this.hud.setVictory(false);
    document.body.classList.add("game-active");

    this._buildLevel();
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.lastTime = performance.now();

    this.player.bindEvents(this.renderer.renderer.domElement);
    this.player.mouseActive = true;
    this.audio.startAmbient();

    this._showMouseNotice();
    requestAnimationFrame(this._boundAnimate);
  }

  restart() {
    this.player.unbindEvents();
    this.audio.stopAmbient();

    this.renderer.clearScene();
    this.monsterMgr.reset();
    this.itemMgr.reset();
    this.particles.clear();

    this.hud.setGameOver(false);
    this.hud.setVictory(false);
    document.body.classList.add("game-active");

    this.player.reset();
    this._buildLevel();
    this.running = true;
    this.gameOver = false;
    this.victory = false;
    this.lastTime = performance.now();

    this.player.bindEvents(this.renderer.renderer.domElement);
    this.player.mouseActive = true;
    this.audio.startAmbient();

    this._showMouseNotice();
    requestAnimationFrame(this._boundAnimate);
  }

  _buildLevel() {
    this.mapName = pick(MAP_NAMES);
    this.hud.setMapName(this.mapName);

    this.maze.generate();
    this.maze.buildMeshes(this.renderer.scene);

    const emptyCells = [...this.maze.emptyCells];
    const playerCell = emptyCells[randi(0, Math.min(50, emptyCells.length - 1))];
    this.player.spawn(playerCell.x, playerCell.y);

    const excludeCells = [{ x: playerCell.x, y: playerCell.y }];

    const itemCells = this.itemMgr.spawn(playerCell);

    for (const c of itemCells.pieces) excludeCells.push(c);
    for (const c of itemCells.ammo) excludeCells.push(c);
    for (const c of itemCells.batteries) excludeCells.push(c);
    for (const c of itemCells.fuses) excludeCells.push(c);
    for (const c of itemCells.powerNodes) excludeCells.push(c);
    excludeCells.push(itemCells.exit);

    this.monsterMgr.spawn(excludeCells);

    for (const pl of this.maze.emptyCells) {
      if (Math.random() < 0.04) {
        const wp = this.maze.worldPos(pl.x, pl.y);
        this.renderer.addPointLight(wp.x, 2.8, wp.z, 0x8866dd, 1.5, 16);
      }
    }

    this.itemMgr.addToScene(this.renderer.scene);
    this.monsterMgr.addToScene(this.renderer.scene);

    this.hud.setLog("Recoge las 5 piezas para ensamblar la llave.");
    this.hud.showMessage("DESPIERTAS EN " + this.mapName, 3500);

    setTimeout(() => {
      this.hud.showMessage("Recoge 5 piezas para crear la llave", 3000);
    }, 4000);
  }

  _animate(time) {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this._update(dt);
    this._checkGameState();
    this._updateHUD();
    this._render();

    requestAnimationFrame(this._boundAnimate);
  }

  _update(dt) {
    if (this.gameOver || this.victory) return;

    this.player.update(dt);
    this.combat.update(dt);

    if (this.player.shootCooldown <= 0 && this.player.mouseButtons.left && this.player.weaponAmmo > 0) {
      const hit = this.combat.shoot(this.player, this.monsterMgr.monsters);
      if (hit) {
        this.audio.playHit();
        this.hud.showMessage("GOLPE: " + hit.type.name, 1500);
      } else if (this.player.weaponAmmo >= 0) {
        this.audio.playShoot();
      }
    }

    if (this.player._interactPending) {
      this.player._interactPending = false;
      this._interact();
    }

    this.monsterMgr.update(dt, this.player.position, this.player.yaw);

    for (const m of this.monsterMgr.monsters) {
      if (m.canDamage(this.player.position)) {
        const result = this.player.applyDamage(COMBAT.MONSTER_DAMAGE);
        if (result) {
          this.audio.playDamage();
          this.particles.addBlood(this.player.position);
          this.renderer.applyShake(1.5);
          this.hud.showMessage("DAÑO de " + m.type.name + "!", 2000);
        }
        if (result === "gameover") {
          this._triggerGameOver();
          return;
        }
      }
    }

    const { monster: nearest, distance: nearestDist } = this.monsterMgr.getNearest(this.player.position);
    this.nearestMonsterDist = nearestDist;

    if (nearestDist < 15) {
      this.monsterNearTimer -= dt;
      if (this.monsterNearTimer <= 0) {
        this.audio.playMonsterNear();
        this.monsterNearTimer = 3;
      }
    }

    this.itemMgr.update(dt);

    const nearItem = this.itemMgr.getNearestInteractable(this.player.position);
    this.player.nearestInteractable = nearItem;

    this.renderer.updateFlashlight(
      this.player.position,
      this.player.yaw,
      this.player.pitch,
      this.player.flashlightOn
    );

    this.renderer.updateShake(dt);
    this.renderer.updateCamera(
      this.player.position,
      this.player.yaw,
      this.player.pitch
    );

    this.particles.update(dt);

    this.footstepTimer -= dt;
    if (
      this.footstepTimer <= 0 &&
      (this.player.keys["w"] ||
        this.player.keys["s"] ||
        this.player.keys["a"] ||
        this.player.keys["d"])
    ) {
      this.audio.playFootstep();
      this.footstepTimer = 0.35;
    }
  }

  _interact() {
    const item = this.player.nearestInteractable;
    if (!item) return;

    switch (item.type) {
      case "piece":
        item.hide();
        this.player.piecesFound++;
        this.audio.playAllyFound();
        this.particles.addSpark(item.mesh.position);

        if (this.player.piecesFound >= ITEMS.PIECES_TOTAL) {
          this.player.keyAssembled = true;
          this.hud.showMessage("¡LLAVE ENSAMBLADA! Busca la salida", 3500);
          this.hud.setLog("La llave está lista. Encuentra el portal de escape.");
        } else {
          this.hud.showMessage(
            "PIEZA " + this.player.piecesFound + " / " + ITEMS.PIECES_TOTAL,
            2000
          );
          this.hud.setLog(
            "Pieza encontrada. Faltan " +
              (ITEMS.PIECES_TOTAL - this.player.piecesFound) +
              " piezas."
          );
        }
        break;

      case "ammo":
        item.hide();
        this.player.weaponAmmo += ITEMS.AMMO_PER_PICKUP;
        this.audio.playPickup();
        this.hud.showMessage("+" + ITEMS.AMMO_PER_PICKUP + " BALAS", 1500);
        break;

      case "battery":
        item.hide();
        this.player.battery = Math.min(
          PLAYER.BATTERY_MAX,
          this.player.battery + ITEMS.BATTERY_RESTORE
        );
        this.audio.playPickup();
        this.hud.showMessage("BATERÍA +" + ITEMS.BATTERY_RESTORE + "%", 1500);
        break;

      case "fuse":
        item.collected = true;
        this.player.escapeEnergy = Math.min(
          100,
          this.player.escapeEnergy + ITEMS.FUSE_ENERGY
        );
        this.audio.playPickup();
        this.hud.showMessage(
          "FUSA +" + ITEMS.FUSE_ENERGY + "% ENERGÍA",
          1500
        );
        break;

      case "power":
        item.collected = true;
        this.player.escapeEnergy = Math.min(
          100,
          this.player.escapeEnergy + ITEMS.POWER_ENERGY
        );
        this.audio.playPickup();
        this.hud.showMessage(
          "NODO DE POTENCIA +" + ITEMS.POWER_ENERGY + "%",
          2500
        );
        this.particles.addSpark(item.mesh.position);
        break;

      case "exit":
        if (!this.player.keyAssembled) {
          this.hud.showMessage(
            "Necesitas ensamblar la llave (" +
              this.player.piecesFound + "/" + ITEMS.PIECES_TOTAL + ")",
            2500
          );
        } else {
          this._triggerVictory();
        }
        break;
    }
  }

  _checkGameState() {
    if (this.gameOver || this.victory) return;
  }

  _updateHUD() {
    let nearestMonsterName = "Ninguno";
    let nearestMonsterState = "---";
    if (this.nearestMonsterDist < 20) {
      const { monster } = this.monsterMgr.getNearest(this.player.position);
      if (monster) {
        nearestMonsterName = monster.type.name;
        nearestMonsterState = monster.stunned
          ? "Aturdido"
          : monster.isObserving
            ? "Observando"
            : this.nearestMonsterDist < 8
              ? "¡CERCA!"
              : "Acechando";
      }
    }

    let interactHint = "";
    if (this.player.nearestInteractable) {
      const item = this.player.nearestInteractable;
      switch (item.type) {
        case "piece":
          interactHint = "[E] Recoger pieza";
          break;
        case "ammo":
          interactHint = "[E] Recoger balas";
          break;
        case "battery":
          interactHint = "[E] Recoger batería";
          break;
        case "fuse":
          interactHint = "[E] Recoger fusa";
          break;
        case "power":
          interactHint = "[E] Activar nodo de potencia";
          break;
        case "exit":
          interactHint = this.player.keyAssembled
            ? "[E] ABRIR PORTAL"
            : "Necesitas la llave";
          break;
      }
    }

    this.hud.update({
      health: this.player.health,
      lives: this.player.lives,
      battery: this.player.battery,
      escapeEnergy: this.player.escapeEnergy,
      piecesFound: this.player.piecesFound,
      piecesTotal: ITEMS.PIECES_TOTAL,
      keyAssembled: this.player.keyAssembled,
      weaponAmmo: this.player.weaponAmmo,
      hasWeapon: this.player.hasWeapon,
      monsterInfo: {
        name: nearestMonsterName,
        state: nearestMonsterState,
        count: this.monsterMgr.monsters.filter((m) => m.alive && !m.stunned).length,
      },
      interactHint,
    });
  }

  _render() {
    this.renderer.render();
  }

  _showMouseNotice() {
    const notice = document.getElementById("look-badge");
    if (notice) {
      notice.style.display = "block";
      setTimeout(() => {
        notice.style.display = "none";
      }, 5000);
    }
  }

  _triggerGameOver() {
    this.gameOver = true;
    this.running = false;
    this.player.unbindEvents();
    this.audio.stopAmbient();
    this.audio.playGameOver();
    this.hud.setGameOver(true);
  }

  _triggerVictory() {
    this.victory = true;
    this.running = false;
    this.player.unbindEvents();
    this.audio.stopAmbient();
    this.audio.playVictory();
    this.hud.showMessage("¡ESCAPASTE DE " + this.mapName + "!", 5000);
    this.hud.setVictory(true);
  }
}
