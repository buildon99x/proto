/* Generated from content/weapons/*.json. Do not edit balance here. */
(function(root){
'use strict';
root.DFWeaponContent={
  "r4-legacy": {
    "version": 1,
    "id": "r4-legacy",
    "weaponId": "r4",
    "name": "R-4",
    "weapon": 3,
    "magazineSize": 30,
    "initialMagazine": 29,
    "initialChamber": 1,
    "initialReserve": 120,
    "modes": [
      "auto",
      "burst"
    ],
    "burstCount": 3,
    "rpm": 600,
    "burstRpm": 600,
    "burstRecovery": 0.2,
    "cycleTime": 0.045,
    "switchTime": 0.35,
    "unequipTime": 0.22,
    "sprintRecovery": 0.19,
    "adsTime": 0.18,
    "inputBuffer": 0.16,
    "cancelRecovery": 0.25,
    "autoReloadDelay": null,
    "cancelReloadOnTrigger": false,
    "maxShotsPerTick": 3,
    "maxCatchUp": 0.2,
    "maxDelta": null,
    "hipSpread": 0.016,
    "adsSpread": 0.0018,
    "movingSpread": 0.01,
    "airSpread": 0.026,
    "recoilSpread": 0.012,
    "recoilPerShot": 0.13,
    "recoilRecovery": 0.48,
    "recoilPitch": 0.009,
    "recoilPitchBloom": 0.006,
    "recoilAdsScale": 0.25,
    "recoilYaw": 0.008,
    "damage": 30,
    "headMultiplier": 2.6,
    "limbMultiplier": 0.72,
    "falloffStart": 35,
    "falloffEnd": 100,
    "minimumDamage": 0.55,
    "maxRange": 160,
    "armorAbsorption": 1,
    "reload": {
      "tactical": {
        "duration": 1.7,
        "transferAt": 1.02,
        "chamberAt": null,
        "stages": [
          [
            "eject",
            0.22
          ],
          [
            "insert",
            1.02
          ],
          [
            "seat",
            1.27
          ],
          [
            "close",
            1.7
          ]
        ]
      },
      "empty": {
        "duration": 2.2,
        "transferAt": 1.05,
        "chamberAt": 1.78,
        "stages": [
          [
            "eject",
            0.22
          ],
          [
            "insert",
            1.05
          ],
          [
            "seat",
            1.28
          ],
          [
            "charge",
            1.78
          ],
          [
            "close",
            2.2
          ]
        ]
      },
      "chamber": {
        "duration": 0.64,
        "transferAt": null,
        "chamberAt": 0.36,
        "stages": [
          [
            "charge",
            0.36
          ],
          [
            "close",
            0.64
          ]
        ]
      }
    },
    "movingAdsReduction": 0.55
  },
  "r4": {
    "version": 1,
    "id": "r4",
    "weaponId": "r4",
    "name": "R-4",
    "weapon": 3,
    "magazineSize": 30,
    "initialMagazine": 29,
    "initialChamber": 1,
    "initialReserve": 120,
    "modes": [
      "auto",
      "burst"
    ],
    "burstCount": 3,
    "rpm": 690,
    "burstRpm": 690,
    "burstRecovery": 0.15,
    "cycleTime": 0.045,
    "switchTime": 0.46,
    "unequipTime": 0.22,
    "sprintRecovery": 0.19,
    "adsTime": 0.22,
    "inputBuffer": 0.08,
    "cancelRecovery": 0.25,
    "autoReloadDelay": 0.3,
    "cancelReloadOnTrigger": true,
    "maxShotsPerTick": 3,
    "maxCatchUp": 0.2,
    "maxDelta": 0.25,
    "hipSpread": 0.02181661564992912,
    "adsSpread": 0.0024434609527920616,
    "movingSpread": 0.01,
    "airSpread": 0.026,
    "recoilSpread": 0.0019198621771937623,
    "recoilPerShot": 0.13,
    "recoilRecovery": 0.48,
    "recoilPitch": 0.009,
    "recoilPitchBloom": 0.006,
    "recoilAdsScale": 0.25,
    "recoilYaw": 0.008,
    "damage": 15,
    "headMultiplier": 1.6,
    "limbMultiplier": 0.8,
    "falloffStart": 35,
    "falloffEnd": 95,
    "minimumDamage": 0.65,
    "maxRange": 160,
    "armorAbsorption": 1,
    "reload": {
      "tactical": {
        "duration": 2.1,
        "transferAt": 1.26,
        "chamberAt": null,
        "stages": [
          [
            "eject",
            0.28
          ],
          [
            "insert",
            1.26
          ],
          [
            "seat",
            1.56
          ],
          [
            "close",
            2.1
          ]
        ]
      },
      "empty": {
        "duration": 2.6,
        "transferAt": 1.24,
        "chamberAt": 2.08,
        "stages": [
          [
            "eject",
            0.26
          ],
          [
            "insert",
            1.24
          ],
          [
            "seat",
            1.55
          ],
          [
            "charge",
            2.08
          ],
          [
            "close",
            2.6
          ]
        ]
      },
      "chamber": {
        "duration": 0.64,
        "transferAt": null,
        "chamberAt": 0.36,
        "stages": [
          [
            "charge",
            0.36
          ],
          [
            "close",
            0.64
          ]
        ]
      }
    },
    "movingAdsReduction": 0.55
  }
};
})(typeof globalThis!=='undefined'?globalThis:this);
