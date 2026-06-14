import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { EggType } from "./data";
import type { FloatingText } from "./gameLogic";

type EggStageProps = {
  egg: EggType;
  progressRatio: number;
  perfectActive: boolean;
  lastFloatingTextId: number;
  lastHatchRarity?: string;
  onEggClick: () => void;
};

class HatcheryScene extends Phaser.Scene {
  egg!: Phaser.GameObjects.Ellipse;
  eggGlow!: Phaser.GameObjects.Ellipse;
  crack!: Phaser.GameObjects.Graphics;
  label!: Phaser.GameObjects.Text;
  onEggClick?: () => void;
  eggConfig?: EggType;
  progressRatio = 0;
  perfectActive = false;
  lastHatchRarity?: string;

  constructor() {
    super("hatchery");
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xfff5cf);
    this.add.circle(width * 0.18, height * 0.2, 46, 0xffd98e, 0.45);
    this.add.circle(width * 0.82, height * 0.18, 62, 0xd6f7ff, 0.5);
    this.add.circle(width * 0.76, height * 0.78, 84, 0xded1ff, 0.42);

    this.eggGlow = this.add.ellipse(width / 2, height / 2 + 10, 230, 270, 0xffc15c, 0.25);
    this.egg = this.add.ellipse(width / 2, height / 2, 150, 190, 0xfff0ba, 1);
    this.egg.setStrokeStyle(8, 0xe89b3d, 1);
    this.egg.setInteractive({ cursor: "pointer" });

    this.add.ellipse(width / 2, height / 2 + 110, 210, 36, 0x8b5b35, 0.22);
    this.crack = this.add.graphics();
    this.label = this.add.text(width / 2, height - 34, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "17px",
      color: "#4a2c15",
      fontStyle: "700"
    }).setOrigin(0.5);

    this.egg.on("pointerdown", () => {
      this.tweens.add({
        targets: this.egg,
        scaleX: 0.92,
        scaleY: 0.86,
        yoyo: true,
        duration: 72,
        ease: "Quad.easeOut"
      });
      this.cameras.main.shake(80, 0.004);
      this.onEggClick?.();
    });

    this.tweens.add({
      targets: this.eggGlow,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.48,
      yoyo: true,
      repeat: -1,
      duration: 1250
    });

    this.renderEgg();
  }

  updateView(props: {
    egg: EggType;
    progressRatio: number;
    perfectActive: boolean;
    lastHatchRarity?: string;
    onEggClick: () => void;
  }) {
    this.eggConfig = props.egg;
    this.progressRatio = props.progressRatio;
    this.perfectActive = props.perfectActive;
    this.lastHatchRarity = props.lastHatchRarity;
    this.onEggClick = props.onEggClick;
    if (this.egg) this.renderEgg();
  }

  renderEgg() {
    const { width, height } = this.scale;
    const egg = this.eggConfig;
    if (!egg) return;

    const shell = Phaser.Display.Color.HexStringToColor(egg.shell).color;
    const accent = Phaser.Display.Color.HexStringToColor(egg.accent).color;
    this.egg.setFillStyle(shell, 1);
    this.egg.setStrokeStyle(this.perfectActive ? 12 : 8, accent, 1);
    this.eggGlow.setFillStyle(accent, this.perfectActive ? 0.48 : 0.22 + this.progressRatio * 0.16);
    this.label.setText(this.perfectActive ? "빛나는 균열! 지금 클릭" : egg.name);

    this.crack.clear();
    const crackLevel = this.perfectActive ? 1 : this.progressRatio;
    if (crackLevel > 0.18) {
      this.crack.lineStyle(this.perfectActive ? 7 : 4, this.perfectActive ? 0xffffff : accent, 0.95);
      const x = width / 2;
      const y = height / 2 - 74;
      this.crack.beginPath();
      this.crack.moveTo(x - 8, y);
      this.crack.lineTo(x + 12, y + 28);
      if (crackLevel > 0.42) this.crack.lineTo(x - 10, y + 58);
      if (crackLevel > 0.68) this.crack.lineTo(x + 18, y + 96);
      this.crack.strokePath();
    }
  }

  burst(text: string, kind: FloatingText["kind"]) {
    const { width, height } = this.scale;
    const color = kind === "perfect" ? "#ffffff" : kind === "hatch" ? "#ffe165" : "#7a421a";
    const item = this.add.text(width / 2 + Phaser.Math.Between(-46, 46), height / 2 - 70, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: kind === "hatch" ? "25px" : "20px",
      color,
      fontStyle: "900",
      stroke: kind === "perfect" ? "#7b48c8" : "#fff5d9",
      strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({
      targets: item,
      y: item.y - 88,
      alpha: 0,
      scale: 1.18,
      duration: 760,
      onComplete: () => item.destroy()
    });
  }
}

export function EggStage({
  egg,
  progressRatio,
  perfectActive,
  lastFloatingTextId,
  lastHatchRarity,
  onEggClick
}: EggStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<HatcheryScene | null>(null);
  const clickRef = useRef(onEggClick);
  clickRef.current = onEggClick;

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;
    const scene = new HatcheryScene();
    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 520,
      height: 420,
      backgroundColor: "#fff5cf",
      scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateView({
      egg,
      progressRatio,
      perfectActive,
      lastHatchRarity,
      onEggClick: () => clickRef.current()
    });
  }, [egg, progressRatio, perfectActive, lastHatchRarity]);

  useEffect(() => {
    if (!lastFloatingTextId) return;
    const latest = document.querySelector<HTMLElement>(`[data-floating-id="${lastFloatingTextId}"]`);
    sceneRef.current?.burst(latest?.dataset.text ?? "+", (latest?.dataset.kind as FloatingText["kind"]) ?? "warmth");
  }, [lastFloatingTextId]);

  return <div className="egg-stage" ref={hostRef} aria-label="클릭 가능한 드래곤 알 무대" />;
}
