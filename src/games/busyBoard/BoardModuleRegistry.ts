import type { BusyBoardModule } from './BusyBoardModule';
import { RockerSwitch } from './modules/RockerSwitch';
import { IndustrialToggle } from './modules/IndustrialToggle';
import { KnifeSwitch } from './modules/KnifeSwitch';
import { DIPArray } from './modules/DIPArray';
import { PullStringCord } from './modules/PullStringCord';
import { PushLatchButton } from './modules/PushLatchButton';
import { KeyRotation } from './modules/KeyRotation';
import { ArcadeDome } from './modules/ArcadeDome';
import { HeavyPedal } from './modules/HeavyPedal';
import { BreakerLever } from './modules/BreakerLever';

// Board 2 Modules
import { RotaryDimmer } from './modules/RotaryDimmer';
import { RGBLightModule } from './modules/RGBLightModule';
import { RainbowCrossfader } from './modules/RainbowCrossfader';
import { ShadowProjection } from './modules/ShadowProjection';
import { StrobeFrequency } from './modules/StrobeFrequency';
import { HaloExpander } from './modules/HaloExpander';
import { ContrastInverter } from './modules/ContrastInverter';
import { DualFingerGradient } from './modules/DualFingerGradient';
import { StereoPannerModule } from './modules/StereoPannerModule';

// Board 3 Modules
import { GearTrainTrio } from './modules/GearTrainTrio';
import { TwoProngOutlet } from './modules/TwoProngOutlet';
import { AudioJack35mm } from './modules/AudioJack35mm';
import { BarrelBoltLatch } from './modules/BarrelBoltLatch';
import { SpringDoorstop } from './modules/SpringDoorstop';
import { RotaryTelephone } from './modules/RotaryTelephone';
import { HeavyHandCrank } from './modules/HeavyHandCrank';
import { HeavyDutyZipper } from './modules/HeavyDutyZipper';
import { TumblerCombination } from './modules/TumblerCombination';
import { ThreadedScrew } from './modules/ThreadedScrew';

export type BusyBoardModuleConstructor = new (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  game?: any
) => BusyBoardModule;

export const BoardModuleRegistry: Record<string, BusyBoardModuleConstructor> = {
  // Board 1
  '001': RockerSwitch,
  '002': IndustrialToggle,
  '003': KnifeSwitch,
  '004': DIPArray,
  '005': PullStringCord,
  '006': PushLatchButton,
  '007': KeyRotation,
  '008': ArcadeDome,
  '009': HeavyPedal,
  '010': BreakerLever,

  // Board 2
  '011': RotaryDimmer,
  '012': RGBLightModule,
  '015': RainbowCrossfader,
  '016': ShadowProjection,
  '017': StrobeFrequency,
  '018': HaloExpander,
  '019': ContrastInverter,
  '020': DualFingerGradient,

  // Board 3
  '021': GearTrainTrio,
  '022': TwoProngOutlet,
  '023': AudioJack35mm,
  '024': BarrelBoltLatch,
  '025': SpringDoorstop,
  '026': RotaryTelephone,
  '027': HeavyHandCrank,
  '028': HeavyDutyZipper,
  '029': TumblerCombination,
  '030': ThreadedScrew,
  '031': StereoPannerModule,
};
