/* GARDEN — which stage a room stands on. */
import { yard } from './stage_yard.js';
import { greenhouse } from './stage_glass.js';
import { cellar } from './stage_cellar.js';
import { rooftop } from './stage_roof.js';
import { shrine } from './stage_shrine.js';

export const STAGES = { yard, greenhouse, cellar, rooftop, shrine };
export const stageOf = id => STAGES[id] || STAGES.yard;
