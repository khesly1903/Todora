import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useGrowAnimation } from "./useGrowAnimation";
import membersShot from "./screenshots/members.png";
import treeShot from "./screenshots/tree.png";
import columnsShot from "./screenshots/columns.png";
import calendarShot from "./screenshots/calendar.png";
import "./landing.css";

export function LandingPage() {
  const { svgRef, play } = useGrowAnimation();
  const { user } = useAuth();
  const primaryCta = user
    ? { to: "/app", label: "Open Todora →" }
    : { to: "/signup", label: "Create account →" };

  useEffect(() => {
    document.title = "Todora. Every task, in its place.";
  }, []);

  return (
    <div className="landing-page">
      <header className="nav-edge container">
        <Link className="wordmark" to="/">
          <svg className="wordmark__mark" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="2" y="2" width="16" height="16" rx="4" />
            <path d="M6 10.5 L9 13.5 L14.5 6.5" />
          </svg>
          Todora
        </Link>
        <div className="nav-edge__actions">
          {!user && <Link className="link-cta" to="/login">Login</Link>}
          <Link className="link-cta" to={primaryCta.to}>{primaryCta.label}</Link>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-art">
            <div className="hero__copy">
              <h1 className="hero__display">Every task, in its place.</h1>
              <p className="hero__lede">
                Todora organizes work the way Finder organizes files. Areas hold Areas and tasks, each one carrying
                a status you can see at a glance.
              </p>
              <p className="hero__cta">
                <Link className="link-cta" to={primaryCta.to}>{primaryCta.label}</Link>
              </p>
            </div>

            <button type="button" className="hero__art" aria-labelledby="grow-caption" onClick={play}>
              <svg ref={svgRef} className="grow" viewBox="0 0 220 220" role="img" aria-hidden="true">
                <rect className="grow__fill grow__fill--not-started" x="30" y="30" width="160" height="160" rx="28" />
                <rect className="grow__fill grow__fill--cooking" x="30" y="30" width="160" height="160" rx="28" />
                <rect className="grow__fill grow__fill--done" x="30" y="30" width="160" height="160" rx="28" />

                <path className="grow__icon grow__icon--not-started" pathLength="100" d="M85 85 L135 135 M135 85 L85 135" />
                <g className="grow__icon grow__icon--cooking">
                  <circle pathLength="100" cx="110" cy="110" r="40" />
                  <path pathLength="100" d="M110 110 L110 84 M110 110 L132 121" />
                </g>
                <path className="grow__icon grow__icon--done" pathLength="100" d="M64 116 L98 148 L156 78" />
              </svg>
              <span className="hero__art-caption" id="grow-caption">Replay: a task, from not started to done</span>
            </button>
          </div>
        </section>

        <section className="position">
          <header className="head-hang">
            <h2>How Todora thinks</h2>
          </header>
          <div className="position__body">
            <p>
              Most task apps flatten everything into one list, sorted by due date or priority, with no sense of
              where a task belongs. Todora doesn’t.
            </p>
            <p>
              Work already has structure. Projects inside projects, tasks inside projects, the way files sit
              inside folders. Todora keeps that structure instead of erasing it, so a list of a hundred tasks stays
              as legible as a list of ten.
            </p>
          </div>
        </section>

        <section className="stages">
          <article className="stage">
            <div>
              <span className="stage__num">1.0</span>
              <h3 className="stage__title">Organize</h3>
              <p className="stage__body">
                Build a tree of Areas, containers for your work, nested as deep as a project needs. Tasks live
                inside an Area, never as a flat pile with no home.
              </p>
            </div>
            <aside className="stage__margin">
              <div className="tree-glyph stage__glyph" aria-hidden="true">
                <div className="tree-glyph__row tree-glyph__row--1"><span className="tree-glyph__bar"></span></div>
                <div className="tree-glyph__row tree-glyph__row--2"><span className="tree-glyph__bar"></span></div>
                <div className="tree-glyph__row tree-glyph__row--3"><span className="tree-glyph__bar"></span></div>
                <div className="tree-glyph__row tree-glyph__row--4"><span className="tree-glyph__bar"></span></div>
              </div>
              <p className="stage__note">
                The same Area name can appear in different branches. Payments under Classes and Payments under
                Invoicing are both valid, and stay distinct.
              </p>
            </aside>
          </article>

          <article className="stage">
            <div>
              <span className="stage__num">2.0</span>
              <h3 className="stage__title">Track</h3>
              <p className="stage__body">
                Click a task’s status to move it from not started, to in progress, to done. Drag and drop to
                reorder, reprioritize, or move a task into a different Area entirely.
              </p>
            </div>
            <aside className="stage__margin">
              <div className="status-glyph stage__glyph" aria-hidden="true">
                <div className="status-glyph__item">
                  <span className="status-glyph__dot"></span>
                  <span className="status-glyph__label">Not started</span>
                </div>
                <div className="status-glyph__item">
                  <span className="status-glyph__dot status-glyph__dot--half"></span>
                  <span className="status-glyph__label">In progress</span>
                </div>
                <div className="status-glyph__item">
                  <span className="status-glyph__dot status-glyph__dot--done"></span>
                  <span className="status-glyph__label">Done</span>
                </div>
              </div>
              <p className="stage__note">
                Status is never colour alone. Every dot carries a label, for anyone who can’t rely on colour.
              </p>
            </aside>
          </article>

          <article className="stage">
            <div>
              <span className="stage__num">3.0</span>
              <h3 className="stage__title">Views</h3>
              <p className="stage__body">
                Switch between a tree, Finder-style columns, or a monthly calendar, not mockups, the actual
                interface. Finished tasks fade out and collapse into a section of their own, so what’s in front of
                you is the work still ahead.
              </p>
            </div>
            <aside className="stage__margin">
              <div className="view-glyph stage__glyph" aria-hidden="true">
                <div className="view-glyph__icon view-glyph__icon--tree">
                  <span></span><span></span><span></span>
                </div>
                <div className="view-glyph__icon view-glyph__icon--columns">
                  <span></span><span></span><span></span>
                </div>
                <div className="view-glyph__icon view-glyph__icon--calendar">
                  <span></span><span></span><span></span><span></span>
                </div>
              </div>
              <p className="stage__note">Switch between them anytime. Same tasks, just a different shape.</p>
            </aside>
            <div className="stage-gallery">
              <div className="stage-gallery__pair">
                <figure className="stage__shot stage__shot--frame">
                  <img src={treeShot} alt="Todora's Tree view, showing a nested Area sidebar and a task's detail inspector" loading="lazy" />
                  <figcaption>Tree</figcaption>
                </figure>
                <figure className="stage__shot stage__shot--float stage__shot--tilt-right">
                  <img src={columnsShot} alt="Todora's Columns view, showing Finder-style drill-down browsing across four levels" loading="lazy" />
                  <figcaption>Columns</figcaption>
                </figure>
              </div>
              <figure className="stage__shot stage__shot--float stage-gallery__main">
                <img src={calendarShot} alt="Todora's Calendar view, showing tasks placed on their due dates across a month" loading="lazy" />
                <figcaption>Calendar</figcaption>
              </figure>
            </div>
          </article>

          <article className="stage">
            <div>
              <span className="stage__num">4.0</span>
              <h3 className="stage__title">Share</h3>
              <p className="stage__body">
                Invite people into a workspace by username, no email required. Owners, editors, and viewers each
                see exactly what their role allows, and an invitation waits for approval before anyone gets in.
              </p>
            </div>
            <aside className="stage__margin">
              <figure className="stage__shot stage__shot--float">
                <img src={membersShot} alt="The Todora members dialog, showing an owner, an editor, and a pending invitation" loading="lazy" />
              </figure>
              <p className="stage__note">
                One owner per workspace. Ownership doesn’t transfer, and it can’t be removed by accident.
              </p>
            </aside>
          </article>
        </section>

        <section className="cta-band">
          <h2>{user ? "Your work is waiting." : "Start with one Area."}</h2>
          <Link className="link-cta" to={primaryCta.to}>{primaryCta.label}</Link>
        </section>
      </main>

      <footer className="foot-letter container">
        <p className="foot-letter__close">Simple to use, organized underneath.</p>
        <p className="foot-letter__meta">
          <a href="https://github.com/khesly1903/Todora" target="_blank" rel="noreferrer">Source on GitHub</a>
          <span aria-hidden="true">·</span>
          <a href="https://github.com/khesly1903/Todora/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
          <span aria-hidden="true">·</span>
          <span>© 2026 Todora</span>
        </p>
      </footer>
    </div>
  );
}
