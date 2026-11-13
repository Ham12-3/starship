/**
 * The whole journey as one short film with narration: factory, rollout, pad,
 * engines, liftoff, space, satellites. Generated with Google Flow (see
 * docs/flow-plates.md), so it is labelled as an AI illustration, not footage.
 *
 * It has sound, so it never autoplays: the reader presses play.
 */
export default function Film() {
  return (
    <section id="film" className="film" aria-labelledby="film-title">
      <div className="film-copy">
        <p className="eyebrow">The short film</p>
        <h2 id="film-title">Factory to orbit in 56 seconds.</h2>
        <p className="lede">The whole journey in one take, with narration. Turn the sound on.</p>
      </div>
      <figure className="film-frame">
        <video controls playsInline preload="none" poster="/film/poster.webp" width={1280} height={720}>
          <source src="/film/factory-to-orbit.mp4" type="video/mp4" />
        </video>
        <figcaption>AI-generated illustration made with Google Flow. Not real footage, and not to scale.</figcaption>
      </figure>
    </section>
  );
}
