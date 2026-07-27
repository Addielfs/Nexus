import * as THREE from "three";
import { LIGHTS } from "../utils/constants.js";

export class Renderer {
  constructor(container) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      78,
      window.innerWidth / window.innerHeight,
      0.1,
      120
    );

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060612);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.018);

    this.ambientLight = new THREE.AmbientLight(0x334466, 2.0);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x445588, 0x222244, 1.6);
    this.scene.add(this.hemiLight);

    this.flashlight = new THREE.SpotLight(
      LIGHTS.FLASHLIGHT,
      LIGHTS.FLASHLIGHT_INTENSITY,
      LIGHTS.FLASHLIGHT_RANGE,
      Math.PI / 5,
      0.35,
      1.5
    );
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.3;
    this.flashlight.shadow.camera.far = 22;
    this.flashlight.shadow.bias = -0.001;
    this.flashlightTarget = new THREE.Object3D();
    this.flashlight.target = this.flashlightTarget;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);

    this.pointLights = [];
    this.screenShake = 0;
    this.shakeOffset = new THREE.Vector3();

    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);
  }

  addPointLight(x, y, z, color, intensity = 1.2, distance = 14) {
    const pl = new THREE.PointLight(color, intensity, distance, 2);
    pl.position.set(x, y, z);
    pl.castShadow = false;
    this.scene.add(pl);
    this.pointLights.push(pl);

    const bulbGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const bulbMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x, y, z);
    this.scene.add(bulb);

    return pl;
  }

  updateFlashlight(playerPos, yaw, pitch, on) {
    const offset = new THREE.Vector3(0, 0.15, 0);
    this.flashlight.position.copy(playerPos).add(offset);

    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));

    const target = this.flashlight.position.clone().add(dir);
    this.flashlightTarget.position.copy(target);

    const targetIntensity = on ? LIGHTS.FLASHLIGHT_INTENSITY : LIGHTS.FLASHLIGHT_INTENSITY * 0.03;
    this.flashlight.intensity += (targetIntensity - this.flashlight.intensity) * 0.15;
  }

  applyShake(amount) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  updateShake(dt) {
    if (this.screenShake > 0.01) {
      const s = this.screenShake;
      this.shakeOffset.set(
        (Math.random() - 0.5) * s * 0.08,
        (Math.random() - 0.5) * s * 0.06,
        (Math.random() - 0.5) * s * 0.04
      );
      this.screenShake *= 0.92;
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.screenShake = 0;
    }
  }

  updateCamera(playerPos, yaw, pitch) {
    this.camera.position.set(
      playerPos.x + this.shakeOffset.x,
      playerPos.y + this.shakeOffset.y,
      playerPos.z + this.shakeOffset.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  clearScene() {
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    this.pointLights = [];
    this.scene.add(this.ambientLight);
    this.scene.add(this.hemiLight);
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
