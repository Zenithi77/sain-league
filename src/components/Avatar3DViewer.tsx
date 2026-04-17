"use client";

import { useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Bounds } from "@react-three/drei";
import { GLTFLoader } from "three-stdlib";
import * as THREE from "three";

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#F15F22" wireframe />
    </mesh>
  );
}

/** Load GLB imperatively so we get the onError callback. */
function Model({ url, onError }: { url: string; onError: () => void }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!disposed) setScene(gltf.scene);
      },
      undefined,
      () => {
        if (!disposed) onError();
      },
    );
    return () => {
      disposed = true;
    };
  }, [url, onError]);

  if (!scene) return <LoadingFallback />;
  return <primitive object={scene} />;
}

function ErrorFallbackUI() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "rgba(255,255,255,0.25)",
      }}
    >
      <i className="fas fa-cube" style={{ fontSize: 40 }} />
      <span
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 14,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        3D модель ачаалахад алдаа гарлаа
      </span>
    </div>
  );
}

interface Avatar3DViewerProps {
  glbUrl: string;
  height?: number;
}

/** Hostnames that need proxying to avoid CORS. */
const PROXY_HOSTS = new Set(["assets.meshy.ai", "storage.googleapis.com"]);

/** Route external GLB URLs through our proxy to avoid CORS. */
function proxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (PROXY_HOSTS.has(parsed.hostname)) {
      return `/api/proxy-model?url=${encodeURIComponent(url)}`;
    }
  } catch {}
  return url;
}

export default function Avatar3DViewer({
  glbUrl,
  height = 560,
}: Avatar3DViewerProps) {
  const resolvedUrl = proxyUrl(glbUrl);
  const [loadError, setLoadError] = useState(false);
  const handleError = useCallback(() => setLoadError(true), []);

  if (loadError) {
    return (
      <div
        style={{
          width: "100%",
          height,
          borderRadius: 12,
          overflow: "hidden",
          background: "#1a1a2e",
          position: "relative",
        }}
      >
        <ErrorFallbackUI />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: "#1a1a2e",
        position: "relative",
      }}
    >
      <Canvas
        camera={{ position: [0, 1, 4], fov: 40 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <Model url={resolvedUrl} onError={handleError} />
          </Center>
        </Bounds>
        <Environment preset="studio" />
        <OrbitControls
          autoRotate
          autoRotateSpeed={2}
          enablePan={false}
          minDistance={1.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}
