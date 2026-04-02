"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  Center,
  Bounds,
} from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#F15F22" wireframe />
    </mesh>
  );
}

interface Avatar3DViewerProps {
  glbUrl: string;
  height?: number;
}

export default function Avatar3DViewer({
  glbUrl,
  height = 560,
}: Avatar3DViewerProps) {
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
        <Suspense fallback={<LoadingFallback />}>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <Model url={glbUrl} />
            </Center>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
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
