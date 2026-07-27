import * as THREE from "three";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  addBlood(position) {
    const count = 12 + Math.floor(Math.random() * 10);
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(
        (Math.random() - 0.5) * 4,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 4
      );
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xff1111,
      size: 0.15,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({
      points,
      velocities,
      life: 1.0,
      maxLife: 1.0,
      count,
      gravity: -15,
      drag: 0.96,
    });
  }

  addSpark(position, color = 0xffcc44) {
    const count = 8;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(
        (Math.random() - 0.5) * 6,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 6
      );
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.08,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({
      points,
      velocities,
      life: 0.6,
      maxLife: 0.6,
      count,
      gravity: -8,
      drag: 0.93,
    });
  }

  addDust(position) {
    const count = 6;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 1] = position.y + Math.random() * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.6;
      velocities.push(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.2 + 0.3,
        (Math.random() - 0.5) * 1.5
      );
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x887766,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({
      points,
      velocities,
      life: 1.5,
      maxLife: 1.5,
      count,
      gravity: 0.4,
      drag: 0.98,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.points);
        p.points.geometry.dispose();
        p.points.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const positions = p.points.geometry.attributes.position.array;
      for (let j = 0; j < p.count; j++) {
        p.velocities[j * 3] *= p.drag;
        p.velocities[j * 3 + 1] += p.gravity * dt;
        p.velocities[j * 3 + 1] *= p.drag;
        p.velocities[j * 3 + 2] *= p.drag;

        positions[j * 3] += p.velocities[j * 3] * dt;
        positions[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        positions[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;

        if (positions[j * 3 + 1] < 0.05) {
          positions[j * 3 + 1] = 0.05;
          p.velocities[j * 3 + 1] *= -0.3;
        }
      }

      p.points.geometry.attributes.position.needsUpdate = true;
      p.points.material.opacity = (p.life / p.maxLife) * 0.9;
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
    }
    this.particles = [];
  }
}
