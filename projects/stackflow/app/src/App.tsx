import { useEffect, useState } from "react";
import { Board } from "./ui/Board";
import { Hud } from "./ui/Hud";
import {
  BankPressOverlay,
  BlockipediaScreen,
  QuickBuyOverlay,
  SettingsScreen,
  ShopScreen,
  SummaryScreen,
  TitleScreen,
  TreasureScreen,
} from "./ui/screens";
import { TouchControls } from "./ui/TouchControls";
import { useGame } from "./ui/useGame";
import * as sfx from "./ui/audio";

export default function App() {
  const { game, fx, busy, act, newRun, force, settings, setSettings } = useGame();
  const [modal, setModal] = useState<"none" | "pedia" | "settings">("none");

  // keyboard routing via remappable bindings (spec §11)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal !== "none") return;
      const k = settings.keys;
      if (game.phase === "play") {
        const map: Record<string, () => void> = {
          [k.left]: act.left,
          [k.right]: act.right,
          [k.down]: act.down,
          [k.rotateCw]: act.rotateCw,
          [k.rotateCw2]: act.rotateCw,
          [k.rotateCcw]: act.rotateCcw,
          [k.rotate180]: act.rotate180,
          [k.lock]: act.drop,
          [k.hold]: act.hold,
        };
        const fn = map[e.code];
        if (fn) {
          e.preventDefault();
          fn();
        }
      } else if (
        (game.phase === "gameover" || game.phase === "victory") &&
        e.code === "KeyR"
      ) {
        newRun(); // one-key restart (spec §8.7 fail-forward)
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, game, modal, newRun, settings.keys]);

  if (modal === "pedia")
    return <BlockipediaScreen game={game} onBack={() => setModal("none")} />;
  if (modal === "settings")
    return (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        onBack={() => setModal("none")}
      />
    );

  switch (game.phase) {
    case "title":
      return (
        <TitleScreen
          game={game}
          onStart={(seed) => newRun(seed)}
          onPedia={() => setModal("pedia")}
          onSettings={() => setModal("settings")}
        />
      );
    case "shop":
      return (
        <ShopScreen
          game={game}
          onBuy={(o) => {
            if (game.buy(o, game.advantages[0])) sfx.buyBlip();
            force();
          }}
          onReroll={() => {
            game.reroll();
            force();
          }}
          onDone={() => {
            game.leaveShop();
            force();
          }}
        />
      );
    case "treasure":
      return (
        <TreasureScreen
          game={game}
          onPick={(i) => {
            game.chooseTreasure(i);
            sfx.buyBlip();
            force();
          }}
        />
      );
    case "gameover":
    case "victory":
      return (
        <SummaryScreen
          game={game}
          victory={game.phase === "victory"}
          onRestart={() => newRun()}
          onTitle={() => {
            game.phase = "title";
            force();
          }}
        />
      );
    default: {
      // play / resolving / cleared / quickbuy render the board
      const reduce = settings.reduceMotion ? "reduce-motion" : "";
      return (
        <main className={`game-shell ${reduce}`}>
          <Board game={game} fx={fx} busy={busy} />
          <Hud
            game={game}
            onBank={() => {
              game.bank();
              force();
            }}
          />
          {game.phase === "cleared" && !busy && (
            <BankPressOverlay
              game={game}
              onBank={() => {
                game.bank();
                force();
              }}
              onPress={() => {
                game.press();
                force();
              }}
            />
          )}
          {game.phase === "quickbuy" && !busy && (
            <QuickBuyOverlay
              game={game}
              onBuy={(o) => {
                if (game.buy(o)) sfx.buyBlip();
                force();
              }}
              onDone={() => {
                game.leaveShop();
                force();
              }}
            />
          )}
          <TouchControls act={act} showHold={game.mods.hold} busy={busy} />
        </main>
      );
    }
  }
}
