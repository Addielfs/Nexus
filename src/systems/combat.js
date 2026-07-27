import * as THREE from "three";
import { COMBAT } from "../utils/constants.js";

export class Combat {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.flashTimer = 0;

    this.muzzleLight = new THREE.PointLight(0xffcc44, 0, 8, 2);
    this.camera.add(this.muzzleLight);
    this.muzzleLight.position.set(0.3, -0.2, -0.5);

    this.muzzleFlash = this._createMuzzlePlane();
    this.camera.add(this.muzzleFlash);

    this.flashOverlay = this._createFlashOverlay();
    this.camera.add(this.flashOverlay);

    this.trails = [];
    this.impacts = [];
  }

  _createMuzzlePlane() {
    const geo = new THREE.PlaneGeometry(0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0.35, -0.25, -0.7);
    mesh.renderOrder = 998;
    return mesh;
  }

  _createFlashOverlay() {
    const geo = new THREE.PlaneGeometry(4, 3);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -0.5);
    mesh.renderOrder = 999;
    return mesh;
  }

  _createTrail(from, to) {
    const points = [from.clone(), to.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 1,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.trails.push({ mesh: line, life: 0.15 });
  }

  _createImpact(pos) {
    const count = 8;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      velocities.push(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 5
      );
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffaa44,
      size: 0.12,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.impacts.push({ mesh: points, velocities, life: 0.5, count });
  }

  shoot(player, monsters) {
    if (player.shootCooldown > 0 || player.weaponAmmo <= 0 || player.isDowned) {
      return null;
    }

    player.shootCooldown = COMBAT.COOLDOWN;
    player.weaponAmmo--;

    this.muzzleLight.intensity = 6;
    this.muzzleFlash.material.opacity = 1;
    this.flashOverlay.material.opacity = 0.12;
    this.flashTimer = COMBAT.FLASH_DURATION;

    const dir = player.getForwardDir();
    this.raycaster.set(this.camera.position, dir);
    this.raycaster.far = 25;

    let hitMonster = null;
    let hitDist = Infinity;
    let hitPoint = null;

    for (const m of monsters) {
      if (!m.alive || m.stunned) continue;
      const meshes = [];
      m.mesh.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });

      const intersects = this.raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0 && intersects[0].distance < hitDist) {
        hitDist = intersects[0].distance;
        hitMonster = m;
        hitPoint = intersects[0].point.clone();
      }
    }

    if (hitMonster) {
      hitMonster.stun();

      const trailEnd = hitPoint || this.camera.position.clone().add(dir.multiplyScalar(hitDist));
      this._createTrail(this.camera.position.clone(), trailEnd);
      this._createImpact(trailEnd);

      return hitMonster;
    }

    const missEnd = this.camera.position.clone().add(dir.clone().multiplyScalar(20));
    this._createTrail(this.camera.position.clone(), missEnd);

    return null;
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashOverlay.material.opacity = 0;
        this.muzzleFlash.material.opacity = 0;
        this.muzzleLight.intensity = 0;
      } else {
        this.flashOverlay.material.opacity *= 0.8;
        this.muzzleFlash.material.opacity *= 0.75;
        this.muzzleLight.intensity *= 0.85;
      }
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.trails.splice(i, 1);
      } else {
        t.mesh.material.opacity = t.life / 0.15;
      }
    }

    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const p = this.impacts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.impacts.splice(i, 1);
        continue;
      }

      const positions = p.mesh.geometry.attributes.position.array;
      for (let j = 0; j < p.count; j++) {
        p.velocities[j * 3] *= 0.92;
        p.velocities[j * 3 + 1] += -12 * dt;
        p.velocities[j * 3 + 1] *= 0.92;
        p.velocities[j * 3 + 2] *= 0.92;

        positions[j * 3] += p.velocities[j * 3] * dt;
        positions[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        positions[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;
      p.mesh.material.opacity = (p.life / 0.5) * 0.9;
    }
  }
}
