import 'reflect-metadata';
import { container, type DependencyContainer } from 'tsyringe';
import {
  CHECKIN_REPOSITORY,
  CLOCK,
  FALLBACK_EXTRACTOR,
  FEELING_EXTRACTOR,
  ID_FACTORY,
  LexiconExtractor,
  PhraseSafetyScreen,
  SAFETY_SCREEN,
  uuidv7Ids,
  WorkersAiExtractor,
  type AiRunner,
  type FeelingExtractor,
} from '@affect-kit/checkin-core';
import { D1CheckinRepository } from './d1-repository.ts';
import type { Env } from './env.ts';

/**
 * Composition root, per request. Worker isolates are reused across requests,
 * so anything bound to this request's env (D1, the AI binding) goes in a child
 * container, never the global one: like providing services at an Angular
 * component's injector instead of in root.
 */
export function requestContainer(env: Env): DependencyContainer {
  const scope = container.createChildContainer();
  const lexicon = new LexiconExtractor();
  scope.registerInstance(CHECKIN_REPOSITORY, new D1CheckinRepository(env.DB));
  scope.registerInstance(FEELING_EXTRACTOR, extractor(env, lexicon));
  scope.registerInstance(FALLBACK_EXTRACTOR, lexicon);
  scope.registerInstance(SAFETY_SCREEN, new PhraseSafetyScreen());
  scope.registerInstance(CLOCK, { now: () => new Date() });
  scope.registerInstance(ID_FACTORY, uuidv7Ids);
  return scope;
}

/** The model the evals picked, when one is configured; otherwise the lexicon on its own. */
function extractor(env: Env, lexicon: FeelingExtractor): FeelingExtractor {
  if (!env.EXTRACTOR_MODEL || !env.AI) return lexicon;
  const ai = env.AI;
  // Ai.run is typed per model id; the port only needs "run a model by name".
  const runner: AiRunner = { run: (model, inputs, options) => ai.run(model as never, inputs as never, options as never) };
  return new WorkersAiExtractor(runner, env.EXTRACTOR_MODEL, env.AI_GATEWAY_ID ? { gatewayId: env.AI_GATEWAY_ID } : {});
}
