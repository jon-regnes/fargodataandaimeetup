/*
  Shared content for every Fargo Data & AI design option.
  Edit THIS file to update events, the Slack link, or the email signup.
*/
window.MEETUP = {
  name: "Fargo Data & AI",
  tagline: "An informal community in the Fargo–Moorhead–West Fargo area.",
  blurb:
    "We meet to share ideas, discuss data and AI trends and tools, and enjoy member-led presentations in a relaxed, welcoming setting.",

  slackUrl:
    "https://join.slack.com/t/fargodatandaimeetup/shared_invite/zt-3q929d6ap-cnqLfZZ0W6Yu3d4pbsNAuA",

  // Email signup POSTs JSON {email} here (server.js forwards it to beehiiv).
  emailEndpoint: "/api/subscribe",

  // Add events here. `start` is local Fargo time. Past events hide automatically.
  events: [
    {
      topic: "AIEdge Summit",
      presenter: "Various",
      start: "2026-10-29T09:00",
      when: "Thursday, October 29th",
      location: "Canopy by Hilton, Sioux Falls",
      url: "https://aiedgesummit.com/",
      external: true, // someone else's event we think is worth attending
    },
    {
      topic: "Various Learnings from an AI Journey",
      presenter: "Ritika Gerdes",
      start: "2026-11-04T17:00",
      when: "Wednesday, November 4th, 5:00 pm",
      location: "Midco Collaboration Room, 1854 NDSU Research Cir N, Fargo, ND",
      url: "",
    },
  ],
};

(function (M) {
  // Events that haven't ended yet (give each one until the end of its day).
  M.upcoming = function () {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    return M.events
      .filter((e) => new Date(e.start) >= cutoff)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  M.subscribe = async function (data) {
    if (!/^\S+@\S+\.\S+$/.test(data.email || "")) {
      throw new Error("That email doesn't look right.");
    }
    if (!M.emailEndpoint) {
      console.info("[placeholder] would subscribe:", data);
      return { ok: true, placeholder: true };
    }
    const res = await fetch(M.emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.ok === false) throw new Error(out.error || "Signup failed. Try again in a bit.");
    return { ok: true };
  };

  M.esc = function (s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  };
})(window.MEETUP);
