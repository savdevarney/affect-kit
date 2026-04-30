import { useRef, useState } from 'react';
import { Rater, Result, Compare, Face } from '@affect-kit/react';
import type { Rating } from '@affect-kit/react';
import type { AffectKitRater } from 'affect-kit/rater';
import type { AffectKitFace } from 'affect-kit/face';

// What this harness validates:
//   - Typed React props (`colorMode`, `showVad`, `beforeRating`, etc.)
//   - Idiomatic onChange — receives a CustomEvent<Rating>
//   - Object-prop passing (Result.rating, Compare.beforeRating/afterRating)
//   - Ref forwarding to call instance methods (rater.reset(), face.triggerShock())
export function App() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const raterRef = useRef<AffectKitRater>(null);
  const faceRef = useRef<AffectKitFace>(null);

  function logLine(line: string) {
    setLog(prev => [...prev.slice(-9), line]);
  }

  return (
    <div className="grid">
      <div className="card">
        <p className="label">&lt;Rater&gt;</p>
        <Rater
          colorMode
          showVad
          onChange={(e) => {
            const r = (e as CustomEvent<Rating>).detail;
            setRating(r);
            logLine(`change → face V=${r.face.v.toFixed(2)} A=${r.face.a.toFixed(2)} labels=${r.labels.length}`);
          }}
          ref={raterRef}
        />
        <button type="button" onClick={() => {
          raterRef.current?.reset();
          setRating(null);
          logLine('rater.reset()');
        }}>reset (via ref)</button>
        <div className="log">{log.length ? log.join('\n') : 'no events yet — drag a feeling, pick chips, commit'}</div>
      </div>

      <div className="card">
        <p className="label">&lt;Result&gt;</p>
        <Result rating={rating} showFace colorMode />
      </div>

      <div className="card">
        <p className="label">&lt;Compare&gt;</p>
        <Compare
          showFace
          colorMode
          beforeLabel="Yesterday"
          afterLabel="Today"
          beforeRating={{
            v: -0.5, a: 0.4, d: 0,
            pad: { v: -0.5, a: 0.4 },
            fromLabels: false,
            labels: [{ name: 'overwhelmed', level: 3 }, { name: 'anxious', level: 2 }],
            timestamp: Date.now() - 86400000,
          }}
          afterRating={{
            v: 0.6, a: 0.2, d: 0,
            pad: { v: 0.6, a: 0.2 },
            fromLabels: false,
            labels: [{ name: 'calm', level: 2 }, { name: 'grateful', level: 2 }],
            timestamp: Date.now(),
          }}
        />
      </div>

      <div className="card">
        <p className="label">&lt;Face&gt; — primitive + ref</p>
        <Face ref={faceRef} v={0.5} a={0.3} style={{ width: 120, height: 120 }} />
        <div>
          <button type="button" onClick={() => {
            faceRef.current?.triggerShock();
            logLine('face.triggerShock()');
          }}>triggerShock() (via ref)</button>
        </div>
      </div>
    </div>
  );
}
