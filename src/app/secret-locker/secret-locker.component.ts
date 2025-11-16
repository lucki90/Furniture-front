import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import * as THREE from 'three';

interface DimensionsForm {
  width: number;
  height: number;
  depth: number;
}

interface ClickablePart {
  mesh: THREE.Mesh;
  type: 'drawerFront' | 'top' | 'carcass';
  id: string;
}

@Component({
  selector: 'app-secret-locker',
  templateUrl: './secret-locker.component.html',
  styleUrls: ['./secret-locker.component.css'],
  standalone: false
})
export class SecretLockerComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('threeContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  dims: DimensionsForm = { width: 100, height: 90, depth: 55 };
  colors: string[] = ['#ffffff', '#f5f5f5', '#d32f2f', '#1976d2', '#388e3c', '#ffa000', '#795548', '#212121'];
  selectedPart?: ClickablePart;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  animationId: number = 0;
  rootGroup = new THREE.Group();
  drawerGroups: { front: ClickablePart; group: THREE.Group; openProgress: number; target: number }[] = [];
  canvasParent!: HTMLDivElement;

  private boundOnPointerDown = (ev: MouseEvent) => this.onPointerDown(ev);
  private boundOnResize = () => this.onResize();

  ngOnInit(): void {
    // inicjalizacja przeniesiona do ngAfterViewInit
  }

  ngAfterViewInit(): void {
    this.canvasParent = this.containerRef.nativeElement;
    // jeśli element ma rozmiar 0, odczekaj chwilę i spróbuj
    if (this.canvasParent.clientWidth === 0 || this.canvasParent.clientHeight === 0) {
      setTimeout(() => this.initThree(), 50);
    } else {
      this.initThree();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousedown', this.boundOnPointerDown);
      window.removeEventListener('resize', this.boundOnResize);
      this.renderer.dispose();
    }
  }

  initThree(): void {
    if (!this.canvasParent) {
      setTimeout(() => this.initThree(), 50);
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e0e0e0');

    const width = this.canvasParent.clientWidth || 800;
    const height = this.canvasParent.clientHeight || 600;
    const aspect = width / height;

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(140, 120, 180);
    this.camera.lookAt(0, 40, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);

    if (!this.canvasParent.contains(this.renderer.domElement)) {
      this.canvasParent.appendChild(this.renderer.domElement);
    }

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
    this.scene.add(light);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(100, 200, 150);
    this.scene.add(dirLight);

    this.scene.add(this.rootGroup);
    this.buildCabinet();

    this.renderer.domElement.addEventListener('mousedown', this.boundOnPointerDown);
    window.addEventListener('resize', this.boundOnResize);
    this.animate();
  }

  onResize(): void {
    if (!this.canvasParent || !this.camera || !this.renderer) return;
    this.camera.aspect = this.canvasParent.clientWidth / this.canvasParent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvasParent.clientWidth, this.canvasParent.clientHeight);
  }

  buildCabinet(): void {
    while (this.rootGroup.children.length) this.rootGroup.remove(this.rootGroup.children[0]);
    this.drawerGroups = [];
    this.selectedPart = undefined;

    const { width: W, height: H, depth: D } = this.dims;
    const materialCarcass = new THREE.MeshPhongMaterial({ color: '#cccccc' });
    const materialTop = new THREE.MeshPhongMaterial({ color: '#bbbbbb' });
    const materialFront = new THREE.MeshPhongMaterial({ color: '#ffffff' });

    const carcassGeom = new THREE.BoxGeometry(W, H, D);
    const carcass = new THREE.Mesh(carcassGeom, materialCarcass);
    carcass.position.set(0, H / 2, 0);
    carcass.userData['type'] = 'carcass';
    this.rootGroup.add(carcass);

    const topGeom = new THREE.BoxGeometry(W + 2, 3, D + 2);
    const top = new THREE.Mesh(topGeom, materialTop);
    top.position.set(0, H + 1.5, 0);
    top.userData['type'] = 'top';
    this.rootGroup.add(top);

    const drawerHeight = (H - 10) / 2;
    for (let i = 0; i < 2; i++) {
      const yCenter = 5 + drawerHeight / 2 + i * drawerHeight;
      const group = new THREE.Group();
      group.position.set(0, 0, 0);

      const frontGeom = new THREE.BoxGeometry(W - 4, drawerHeight - 4, 2);
      const frontMesh = new THREE.Mesh(frontGeom, materialFront.clone());
      frontMesh.position.set(0, yCenter, D / 2 + 1);
      frontMesh.userData['type'] = 'drawerFront';
      frontMesh.userData['drawerIndex'] = i;

      const boxGeom = new THREE.BoxGeometry(W - 6, drawerHeight - 6, D - 10);
      const boxMat = new THREE.MeshPhongMaterial({ color: '#eeeeee' });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.set(0, yCenter, (D / 2) - (D - 10) / 2);

      group.add(boxMesh);
      group.add(frontMesh);
      this.rootGroup.add(group);

      const clickable: ClickablePart = { mesh: frontMesh, type: 'drawerFront', id: `drawer-${i}` };
      this.drawerGroups.push({ front: clickable, group, openProgress: 0, target: 0 });
    }
  }

  applyDimensions(): void {
    this.buildCabinet();
  }

  onPointerDown(event: MouseEvent): void {
    if (!this.renderer) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.rootGroup.children, true);
    if (intersects.length) {
      const mesh = intersects[0].object as THREE.Mesh;
      const t = mesh.userData['type'];
      if (t === 'drawerFront' || t === 'top' || t === 'carcass') {
        this.selectedPart = { mesh, type: t, id: mesh.userData['drawerIndex'] != null ? `drawer-${mesh.userData['drawerIndex']}` : t };
      } else {
        this.selectedPart = undefined;
      }
    } else {
      this.selectedPart = undefined;
    }
  }

  setColor(hex: string): void {
    if (!this.selectedPart) return;
    const mat = (this.selectedPart.mesh.material as THREE.MeshPhongMaterial);
    mat.color.set(hex);
  }

  toggleDrawer(): void {
    if (!this.selectedPart || this.selectedPart.type !== 'drawerFront') return;
    const idx = this.selectedPart.mesh.userData['drawerIndex'];
    const drawer = this.drawerGroups.find(d => d.front.mesh.userData['drawerIndex'] === idx);
    if (!drawer) return;
    drawer.target = drawer.target === 0 ? 1 : 0;
  }

  animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    for (const d of this.drawerGroups) {
      const speed = 0.06;
      if (Math.abs(d.openProgress - d.target) > 0.001) {
        d.openProgress += (d.target - d.openProgress) * speed;
        const distance = 35;
        d.group.position.z = d.openProgress * distance;
      }
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  trackByIndex(i: number): number {
    return i;
  }
}
