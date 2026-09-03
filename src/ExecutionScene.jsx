import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function makeLabel(text, palette = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = palette.background || 'rgba(13, 18, 28, 0.88)';
  context.strokeStyle = palette.border || 'rgba(255, 255, 255, 0.25)';
  context.lineWidth = 6;
  roundRect(context, 18, 26, 220, 76, 16);
  context.fill();
  context.stroke();
  context.fillStyle = palette.text || '#f8fbff';
  context.font = '700 38px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(text), 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.08, 0.54, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function getSceneValues(lesson) {
  const { meta, trace } = lesson;
  if (meta.arrayName) {
    const dataStep = trace.find((item) => item.state.dataStructures[meta.arrayName]);
    return dataStep?.state.dataStructures[meta.arrayName]?.values || [];
  }

  const outputs = trace
    .filter((item) => item.action.type === 'OUTPUT' && typeof item.action.value === 'number')
    .map((item) => item.action.value);
  return outputs.length ? outputs : [1, 2, 3, 4, 5];
}

function getPrintedValues(trace, step) {
  return trace
    .slice(0, step + 1)
    .filter((item) => item.action.type === 'OUTPUT' && typeof item.action.value === 'number')
    .map((item) => item.action.value);
}

export default function ExecutionScene({ lesson, step }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const width = Math.max(host.clientWidth, 320);
    const height = Math.max(host.clientHeight, 300);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#10131a');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 5.6, 9.2);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', '3D execution visualization');
    host.replaceChildren(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xdde8ff, 0x141820, 2.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 7, 5);
    scene.add(key);

    const fill = new THREE.PointLight(0xffce73, 38, 14);
    fill.position.set(-4, 3, 4);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 7),
      new THREE.MeshStandardMaterial({ color: '#171b24', roughness: 0.72, metalness: 0.08 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    scene.add(floor);

    const grid = new THREE.GridHelper(12, 12, '#3b4453', '#252b36');
    grid.position.y = 0.01;
    scene.add(grid);

    const traceStep = lesson.trace[step];
    const activePointer = traceStep?.state.pointers.current_index ?? null;
    const values = getSceneValues(lesson);
    const printedValues = getPrintedValues(lesson.trace, step);
    const isCounting = lesson.report.pattern === 'counting';
    const threshold = lesson.meta.threshold;
    const group = new THREE.Group();
    scene.add(group);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.08, 0.16),
      new THREE.MeshStandardMaterial({ color: '#3d4657', roughness: 0.55 }),
    );
    rail.position.set(0, 0.2, -0.1);
    group.add(rail);

    const itemGroup = new THREE.Group();
    group.add(itemGroup);
    const spacing = Math.min(1.22, 8.8 / Math.max(values.length - 1, 1));
    const startX = -((values.length - 1) * spacing) / 2;
    const activeMeshes = [];

    values.forEach((value, index) => {
      const x = startX + index * spacing;
      const hasPrinted = isCounting && printedValues.includes(value);
      const hasPointer = activePointer !== null;
      const hasPassed = !isCounting && hasPointer && index <= activePointer && Number(value) > Number(threshold);
      const isSkipped = !isCounting && hasPointer && index < activePointer && Number(value) <= Number(threshold);
      const isActive = isCounting ? value === activePointer : index === activePointer;
      const color = isActive ? '#f2b84b' : hasPrinted || hasPassed ? '#3fc58f' : isSkipped ? '#d56a5f' : '#6f7f95';

      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.72, 0.72),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.35,
          metalness: 0.12,
          emissive: isActive ? '#4a2f03' : '#000000',
          emissiveIntensity: isActive ? 0.35 : 0,
        }),
      );
      block.position.set(x, isActive ? 0.92 : 0.55, 0);
      block.rotation.set(0.08, 0.28, -0.06);
      itemGroup.add(block);

      const label = makeLabel(value, {
        background: isActive ? 'rgba(75, 45, 4, 0.9)' : 'rgba(17, 21, 31, 0.9)',
        border: isActive ? 'rgba(255, 208, 116, 0.8)' : 'rgba(190, 206, 230, 0.3)',
      });
      label.position.set(x, isActive ? 1.72 : 1.34, 0);
      itemGroup.add(label);

      if (isActive) activeMeshes.push(block, label);
    });

    const gate = new THREE.Group();
    const gateColor = traceStep?.action.result === false ? '#d56a5f' : '#3fc58f';
    const gateMaterial = new THREE.MeshStandardMaterial({ color: gateColor, roughness: 0.3, metalness: 0.18 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.055, 16, 64), gateMaterial);
    ring.rotation.x = Math.PI / 2;
    gate.add(ring);
    const gatePostA = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.65, 12), gateMaterial);
    gatePostA.position.set(-0.86, 0.42, 0);
    const gatePostB = gatePostA.clone();
    gatePostB.position.x = 0.86;
    gate.add(gatePostA, gatePostB);
    gate.position.set(0, 1.05, -1.28);
    group.add(gate);

    const gateLabel = makeLabel(isCounting ? 'loop check' : `> ${threshold}`, {
      background: 'rgba(20, 27, 37, 0.94)',
      border: 'rgba(84, 204, 154, 0.5)',
      text: '#e9fff5',
    });
    gateLabel.position.set(0, 2.28, -1.28);
    gateLabel.scale.set(1.55, 0.76, 1);
    group.add(gateLabel);

    const outputBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 1.04, 0.34, 36),
      new THREE.MeshStandardMaterial({ color: '#27313f', roughness: 0.46, metalness: 0.18 }),
    );
    outputBase.position.set(4.75, 0.22, 0.12);
    group.add(outputBase);

    const outputLabel = makeLabel(isCounting ? 'output' : lesson.meta.totalName || 'answer', {
      background: 'rgba(35, 28, 15, 0.92)',
      border: 'rgba(244, 190, 88, 0.6)',
      text: '#fff3d3',
    });
    outputLabel.position.set(4.75, 1.18, 0.12);
    outputLabel.scale.set(1.34, 0.66, 1);
    group.add(outputLabel);

    if (isCounting) {
      printedValues.slice(-7).forEach((value, index) => {
        const chip = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.26, 0.46),
          new THREE.MeshStandardMaterial({ color: '#f2b84b', roughness: 0.42, metalness: 0.08 }),
        );
        chip.position.set(4.75, 0.58 + index * 0.18, 0.12);
        group.add(chip);

        const chipLabel = makeLabel(value, {
          background: 'rgba(54, 38, 12, 0.96)',
          border: 'rgba(255, 216, 141, 0.56)',
        });
        chipLabel.position.set(4.75, 0.94 + index * 0.18, 0.12);
        chipLabel.scale.set(0.44, 0.22, 1);
        group.add(chipLabel);
      });
    } else {
      const currentTotal = traceStep?.state.variables[lesson.meta.totalName] ?? 0;
      const totalLabel = makeLabel(currentTotal, {
        background: 'rgba(54, 38, 12, 0.96)',
        border: 'rgba(255, 216, 141, 0.72)',
      });
      totalLabel.position.set(4.75, 1.8, 0.12);
      totalLabel.scale.set(1.18, 0.58, 1);
      group.add(totalLabel);
    }

    const actionLabel = makeLabel((traceStep?.action.type || 'TRACE').replace(/_/g, ' '), {
      background: 'rgba(15, 20, 29, 0.96)',
      border: 'rgba(158, 176, 207, 0.35)',
      text: '#f8fbff',
    });
    actionLabel.position.set(-4.35, 2.1, 0.25);
    actionLabel.scale.set(1.84, 0.82, 1);
    group.add(actionLabel);

    let frame = 0;
    let resizeObserver;
    let animationId;
    let sampledPixels = false;

    const samplePixels = () => {
      if (sampledPixels) return;
      sampledPixels = true;
      const gl = renderer.getContext();
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const points = [
        [Math.floor(width * 0.5), Math.floor(height * 0.5)],
        [Math.floor(width * 0.25), Math.floor(height * 0.55)],
        [Math.floor(width * 0.75), Math.floor(height * 0.45)],
        [Math.floor(width * 0.5), Math.floor(height * 0.75)],
      ];
      const colors = points.map(([x, y]) => {
        const pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return Array.from(pixel);
      });
      const nonBlank = colors.some(([red, green, blue, alpha]) => alpha > 0 && red + green + blue > 20);
      host.dataset.pixelCheck = JSON.stringify({
        ok: nonBlank,
        width,
        height,
        samples: colors,
        objects: group.children.length,
      });
    };

    const render = () => {
      frame += 0.016;
      group.rotation.y = Math.sin(frame * 0.9) * 0.055;
      gate.rotation.z = Math.sin(frame * 2.2) * 0.08;
      activeMeshes.forEach((mesh, index) => {
        mesh.position.y += Math.sin(frame * 5 + index) * 0.0025;
      });
      renderer.render(scene, camera);
      if (frame > 0.05) samplePixels();
      animationId = window.requestAnimationFrame(render);
    };

    const resize = () => {
      const nextWidth = Math.max(host.clientWidth, 320);
      const nextHeight = Math.max(host.clientHeight, 300);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    render();

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.map?.dispose();
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      host.replaceChildren();
    };
  }, [lesson, step]);

  return <div ref={hostRef} className="scene-host" />;
}
