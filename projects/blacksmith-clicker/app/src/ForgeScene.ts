import Phaser from "phaser";

type ForgeCallbacks = {
  onForgeClick: () => void;
};

export class ForgeScene extends Phaser.Scene {
  private callbacks: ForgeCallbacks;
  private weapon!: Phaser.GameObjects.Container;
  private blade!: Phaser.GameObjects.Rectangle;
  private hammer!: Phaser.GameObjects.Text;
  private glow!: Phaser.GameObjects.Arc;
  private particles: Phaser.GameObjects.Arc[] = [];
  private progress = 0;
  private target = 100;

  constructor(callbacks: ForgeCallbacks) {
    super("ForgeScene");
    this.callbacks = callbacks;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2 + 44, 340, 112, 0x7a4f32, 1).setStrokeStyle(5, 0x3a2418);
    this.add.ellipse(width / 2, height / 2 + 78, 270, 54, 0x2e2220, 0.34);
    this.add.rectangle(width / 2, height / 2 + 16, 190, 54, 0x4b5966, 1).setStrokeStyle(4, 0x202830);
    this.add.rectangle(width / 2, height / 2 + 36, 260, 34, 0x26323b, 1).setStrokeStyle(3, 0x151b20);

    this.glow = this.add.circle(width / 2, height / 2 - 22, 64, 0xff7b30, 0.18);
    this.blade = this.add.rectangle(0, 0, 188, 24, 0x929aa4, 1).setStrokeStyle(3, 0x303a43);
    const hilt = this.add.rectangle(-110, 0, 42, 16, 0x9a6434, 1).setStrokeStyle(2, 0x3d2617);
    const guard = this.add.rectangle(-82, 0, 14, 58, 0xf0c767, 1).setStrokeStyle(2, 0x6c4b17);
    const tip = this.add.triangle(102, 0, 0, -18, 0, 18, 42, 0, 0xc9d2dc, 1).setStrokeStyle(2, 0x303a43);
    this.weapon = this.add.container(width / 2 + 16, height / 2 - 32, [this.blade, tip, guard, hilt]);
    this.weapon.setSize(260, 84);
    this.weapon.setInteractive({ useHandCursor: true });
    this.weapon.on("pointerdown", () => this.callbacks.onForgeClick());

    this.hammer = this.add.text(width / 2 - 102, height / 2 - 130, "🔨", {
      fontFamily: "Segoe UI Emoji, Arial",
      fontSize: "58px"
    });
    this.hammer.setOrigin(0.5);
    this.hammer.setRotation(-0.45);

    const label = this.add.text(width / 2, height - 34, "CLICK THE ANVIL", {
      fontFamily: "Verdana, Arial",
      fontSize: "13px",
      fontStyle: "700",
      color: "#ffebbd"
    });
    label.setOrigin(0.5);
    label.setAlpha(0.62);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
      if (targets.length === 0) {
        this.callbacks.onForgeClick();
      }
    });
  }

  setProgress(progress: number, target: number) {
    this.progress = progress;
    this.target = target;
    const ratio = Phaser.Math.Clamp(progress / target, 0, 1);
    const hot = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(146, 154, 164),
      new Phaser.Display.Color(255, 110, 43),
      100,
      Math.round(ratio * 100)
    );
    this.blade.setFillStyle(Phaser.Display.Color.GetColor(hot.r, hot.g, hot.b));
    this.glow.setAlpha(0.14 + ratio * 0.42);
    this.glow.setScale(1 + ratio * 0.75);
    this.weapon.setRotation(Math.sin(this.time.now / 220) * ratio * 0.035);
  }

  playStrike() {
    this.tweens.killTweensOf(this.hammer);
    this.hammer.setRotation(-0.78);
    this.tweens.add({
      targets: this.hammer,
      rotation: -0.18,
      yoyo: true,
      duration: 72,
      ease: "Quad.easeIn"
    });

    this.cameras.main.shake(58, 0.0035);
    this.spawnSparks();
  }

  playComplete(isRare: boolean) {
    const { width, height } = this.scale;
    this.cameras.main.flash(220, 255, isRare ? 231 : 204, isRare ? 115 : 180);
    if (isRare) {
      this.cameras.main.shake(280, 0.012);
    }
    const burst = this.add.circle(width / 2 + 12, height / 2 - 28, 22, isRare ? 0xfff2a8 : 0xffc369, 0.65);
    this.tweens.add({
      targets: burst,
      scale: isRare ? 7 : 4.5,
      alpha: 0,
      duration: isRare ? 720 : 460,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy()
    });
  }

  update() {
    this.setProgress(this.progress, this.target);
  }

  private spawnSparks() {
    const x = this.weapon.x + Phaser.Math.Between(-40, 82);
    const y = this.weapon.y + Phaser.Math.Between(-14, 18);
    for (let index = 0; index < 8; index += 1) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xffd166, 1);
      this.particles.push(spark);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-92, 92),
        y: y + Phaser.Math.Between(-76, 42),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(260, 520),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy()
      });
    }
  }
}

export function createForgeGame(parent: HTMLElement, callbacks: ForgeCallbacks) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#23171b",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight
    },
    render: {
      antialias: true
    },
    scene: [new ForgeScene(callbacks)]
  });
}
