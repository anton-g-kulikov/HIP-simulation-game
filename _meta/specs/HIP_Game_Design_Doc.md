# High Impact Professionals — Game Design Document

## 1. Document Purpose

This document translates the product concept into a playable game system.

It defines:

- the daily player experience;
- campaign structure;
- career-capital systems;
- recurring pipelines;
- opportunity generation;
- consequence resolution;
- progression and difficulty;
- impact scoring;
- balancing assumptions;
- MVP scope.

The game is not intended to predict a player’s real career. It is a strategy game designed to build intuition for career decisions as sequential investments under uncertainty.

---

# 2. Game Premise

The player begins at age 28 with an established but incomplete professional profile.

Every real day, the player allocates a limited Energy budget across career investments. The consequences appear on subsequent days, sometimes immediately and sometimes after several turns.

The player controls allocation, not execution.

They do not answer interview questions, write posts, complete assignments, negotiate salaries, or play profession-specific mini-games. Those activities are simulated.

The central question is always:

> Where should I invest my limited career energy during this period?

Over 36 daily sessions, the simulation covers approximately sixteen years of professional life.

The final result is evaluated primarily through expected social impact, while also showing career capital, financial security, professional achievements, and forgone opportunities.

---

# 3. Design Principles

## 3.1 One Meaningful Daily Decision

A session should take approximately two to five minutes.

The player should face a small number of consequential allocation choices rather than many low-value interactions.

## 3.2 Allocation, Not Micromanagement

The player decides whether to invest in an interview pipeline, current work, learning, a project, networking, public work, or another career asset.

The simulation determines how that investment is executed and resolved.

## 3.3 Delayed and Uncertain Feedback

Career investments rarely produce deterministic or immediate outcomes.

The game should model:

- delays;
- incomplete information;
- probabilistic outcomes;
- hidden interactions;
- path dependence;
- compounding.

## 3.4 No Universally Dominant Strategy

Earning to give, direct work, research, entrepreneurship, policy, nonprofit leadership, operations, and other paths should all be viable under appropriate conditions.

No cause area or profession should be mechanically presented as morally superior in every situation.

## 3.5 Increasing Strategic Altitude

The meaning of a turn changes as the campaign progresses.

The player first improves an existing trajectory, then explores alternatives, and finally deploys accumulated leverage.

## 3.6 Legible Consequences

Outcomes may be uncertain, but they should not feel arbitrary.

The game should explain which player choices, profile characteristics, market conditions, and random factors contributed to an outcome.

---

# 4. Campaign Structure

A full campaign contains 36 turns, with one turn unlocked per real day.

## Level 1 — Exploitation

**Age:** 28–29  
**Duration:** 12 turns  
**Time represented per turn:** 1 month

### Objective

Produce the strongest results from the player’s existing position and accumulated career capital.

The player inherits:

- a current role;
- a profession;
- domain experience;
- skill levels;
- a network;
- a reputation level;
- financial runway;
- initial cause interests;
- active or latent opportunities.

### Typical decisions

- invest in current job performance;
- pursue a promotion;
- continue an interview process;
- apply to a highly relevant role;
- finish an existing side project;
- deepen an existing specialization;
- convert existing expertise into public reputation;
- increase earnings or donations.

### Core tension

The player has limited Energy and several plausible near-term opportunities.

The best move is usually not reinvention. It is identifying which existing assets can produce the strongest evidence, progress, and optionality.

---

## Level 2 — Exploration

**Age:** 29–32  
**Duration:** 12 turns  
**Time represented per turn:** 1 quarter

### Objective

Evaluate larger career changes and gather evidence about alternative paths.

### Typical decisions

- switch profession;
- change industry or cause area;
- join a startup;
- move from private industry into government or nonprofit work;
- begin graduate education;
- launch a serious project;
- relocate;
- accept lower compensation for greater direct impact;
- abandon a high-status but poor-fit trajectory;
- test entrepreneurship.

### Core tension

Exploration creates information and option value but can interrupt compounding on the current path.

The player must distinguish between productive exploration and repeated resetting.

---

## Level 3 — Leverage

**Age:** 32–44  
**Duration:** 12 turns  
**Time represented per turn:** 1 year

### Objective

Deploy accumulated career capital toward high-leverage outcomes.

### Typical decisions

- lead or found an organization;
- scale an existing venture;
- direct a research agenda;
- enter senior government service;
- become a major donor or grantmaker;
- build a field or institution;
- mentor and allocate talent;
- influence policy;
- commit to a cause area;
- use reputation and network to coordinate others.

### Core tension

Late-stage choices have large upside, high opportunity cost, and greater irreversibility.

The question shifts from “What can I become?” to:

> What can someone with my accumulated position now accomplish?

---

# 5. Daily Session Flow

Each session follows the same top-level structure.

## 5.1 Outcome Review

The player sees consequences from prior investments.

Examples:

- application accepted or rejected;
- interview pipeline advanced;
- current work produced visible impact;
- promotion probability increased;
- project reached a milestone;
- public work attracted attention;
- a network relationship produced an introduction;
- a grant application succeeded;
- a market or life event changed the value of an opportunity.

Each outcome should show:

- what happened;
- which earlier action contributed;
- whether the result was expected, unusually good, or unusually bad;
- what changed in the player state.

## 5.2 State Update

The player sees a compact career snapshot:

- age and campaign stage;
- current role;
- compensation and runway;
- active pipelines;
- core career-capital indicators;
- current impact trajectory;
- major constraints or events.

## 5.3 New Opportunities

The system generates a limited set of actionable opportunities based on:

- player profile;
- current profession and seniority;
- career capital;
- active cause interests;
- market state;
- prior decisions;
- network and reputation;
- unresolved pipelines;
- campaign stage.

## 5.4 Energy Allocation

The player receives a fixed Energy budget and assigns it across available actions.

The player may invest all Energy, some Energy, or none.

## 5.5 Turn Resolution

The selected investments enter the simulation.

Some resolve next turn. Others update progress bars, probabilities, or hidden state and may not become visible for several turns.

The session ends with a concise preview of pending developments without revealing exact outcomes.

---

# 6. Energy System

## 6.1 Base Energy

The default budget is **10 Energy per turn** at all campaign stages.

The represented time changes, but the decision constraint remains stable.

This preserves interface consistency while changing the magnitude of available actions.

## 6.2 Example Base Costs

### Level 1: Monthly

- Accept relevant inbound opportunity: 1
- Apply to a relevant role: 2
- Prepare for and complete an interview stage: 3–5
- Complete a home assignment: 5–10
- Invest in current job: 1–5
- Invest in a side project: 1–10
- Professional-network engagement: 1–5
- Public work or owned channel: 1–5
- Structured learning: 1–5

### Level 2: Quarterly

- Test a new professional path: 3–7
- Complete a substantial project milestone: 4–8
- Pursue a major role change: 4–8
- Develop a serious specialization: 3–7
- Build a new network cluster: 2–6
- Prepare a relocation or education transition: 5–10

### Level 3: Annual

- Lead a major organizational initiative: 4–8
- Found or scale an organization: 6–10
- Enter senior policy or research work: 5–9
- Allocate capital or grants: 3–8
- Build a field-level institution: 7–10
- Shift cause area: 5–10

## 6.3 Repetition Cost

Repeated use of the same action category increases its Energy cost until the action cools down.

Example:

| Repetition state | Cost multiplier |
|---|---:|
| Fresh | 1.0× |
| Repeated once | 1.5× |
| Repeated twice | 2.0× |
| Repeated three times | 3.0× |

The exact curve may differ by action.

### Purpose

This system prevents a single-action strategy such as:

- mass applying every turn;
- investing only in public reputation;
- repeatedly using current-job effort;
- continuously switching paths.

It rewards diversified investment without imposing hard caps.

## 6.4 Cooldown

Each action category has a recovery rate.

Examples:

- applications: fast cooldown;
- interviews: medium cooldown;
- home assignments: slow cooldown;
- public work: medium cooldown;
- major career exploration: very slow cooldown;
- current-job investment: fast to medium cooldown.

Cooldown may depend on campaign stage.

## 6.5 Energy Modifiers

Energy may be temporarily affected by one-off events or persistent conditions.

Examples:

- burnout;
- caregiving;
- illness;
- financial stress;
- strong organizational support;
- sabbatical;
- reduced working hours.

These modifiers should be relatively rare and should not turn the game into personal-life management.

---

# 7. Career Capital Model

Career capital is represented through a compact set of role-agnostic dimensions.

## 7.1 Capability

Ability to solve relevant problems.

Subcomponents may include:

- analytical ability;
- technical depth;
- execution;
- leadership;
- communication;
- domain expertise;
- research ability;
- operational judgment.

The player does not need to see every internal variable.

## 7.2 Evidence

Credible proof that the player has produced meaningful results.

Sources:

- successful projects;
- promotions;
- research;
- measurable impact;
- organizational outcomes;
- public artifacts;
- references.

Evidence is distinct from raw capability.

## 7.3 Reputation

How widely the player is known and what they are known for.

Reputation affects:

- inbound opportunities;
- credibility;
- ability to recruit;
- ability to fundraise;
- access to senior roles;
- public influence.

## 7.4 Network

The number, relevance, and strength of trusted professional relationships.

Network affects:

- referrals;
- private opportunities;
- information quality;
- collaboration;
- hiring;
- fundraising;
- policy access.

## 7.5 Financial Capital

Savings, compensation, and financial runway.

Financial capital affects:

- risk tolerance;
- ability to retrain;
- ability to found an organization;
- ability to accept lower-paid direct work;
- donation capacity;
- resilience to shocks.

## 7.6 Influence

Ability to affect decisions, institutions, resources, or other people’s work.

Influence becomes increasingly important during the Leverage stage.

## 7.7 Cause Knowledge

Understanding of a cause area, its institutions, bottlenecks, and intervention landscape.

Cause interest alone is not enough.

The player may care deeply about a problem but lack relevant knowledge or fit.

## 7.8 Personal Fit

A partially hidden relationship between the player and a path.

Fit affects:

- learning speed;
- performance;
- sustainability;
- probability of exceptional outcomes.

The player learns about fit through action rather than selecting it directly at the beginning.

---

# 8. Persistent Pipelines and Loops

The game contains seven primary recurring systems.

## 8.1 Hiring Pipeline

### Stages

Role discovered  
→ Application or inbound acceptance  
→ Early interview  
→ Advanced interview  
→ Assignment or final stage  
→ Offer  
→ Accept or decline

### Player decisions

The player only decides whether and how much Energy to invest in the pipeline.

### Variables

- role relevance;
- capability match;
- evidence match;
- competition;
- network access;
- reputation;
- preparation investment;
- employer quality;
- market conditions.

### Outputs

- new job;
- compensation change;
- title or scope change;
- domain shift;
- prestige;
- access to new networks;
- future opportunity changes.

### Failure behavior

Rejected pipelines should sometimes produce information, weak connections, or reputation rather than only disappearing.

---

## 8.2 Current Employer Pipeline

### Stages

Energy investment  
→ Better execution or wider responsibility  
→ Visible result  
→ Recognition  
→ Expanded scope, raise, promotion, or political capital

### Variables

- manager quality;
- organizational growth;
- project importance;
- visibility;
- capability;
- accumulated trust;
- company health.

### Outputs

- evidence;
- compensation;
- title;
- leadership;
- influence;
- stronger future hiring prospects.

### Risks

- invisible work;
- promotion freeze;
- manager departure;
- organizational politics;
- company decline;
- overinvestment in a low-upside environment.

---

## 8.3 Learning Pipeline

### Stages

Study  
→ Practice  
→ Applied use  
→ Competency  
→ Recognized specialization

### Design rule

Learning without application has sharply diminishing value.

### Outputs

- capability;
- access to new opportunity pools;
- improved success probabilities;
- cause knowledge;
- better judgment.

### Risks

- credential accumulation without evidence;
- studying an oversupplied field;
- abandoning learning before application;
- choosing a path with poor personal fit.

---

## 8.4 Portfolio and Venture Pipeline

### Stages

Idea  
→ Prototype or initial work  
→ Launch  
→ Adoption or validation  
→ Evidence, organization, or venture

### Possible forms

- software product;
- research project;
- nonprofit initiative;
- policy proposal;
- public resource;
- community;
- book;
- educational program.

### Outputs

- evidence;
- capability;
- reputation;
- network;
- entrepreneurship option;
- direct impact.

### Risks

- no adoption;
- weak problem selection;
- poor execution;
- competition;
- mission drift;
- opportunity cost.

---

## 8.5 Public Work and Reputation Pipeline

### Stages

Create public artifact  
→ Distribution  
→ Audience recognition  
→ Domain reputation  
→ Inbound opportunities and influence

### Possible actions

- writing;
- speaking;
- teaching;
- open research;
- public analysis;
- media participation.

### Outputs

- reputation;
- network;
- invitations;
- hiring advantages;
- funding opportunities;
- field influence.

### Risks

- visibility without substance;
- reputational lock-in;
- controversy;
- time diverted from capability or evidence;
- platform dependence.

---

## 8.6 Network Pipeline

### Stages

Contact  
→ Repeated interaction  
→ Trust  
→ Collaboration or referral  
→ Long-term relationship

### Outputs

- information;
- referrals;
- hidden opportunities;
- cofounders;
- hires;
- mentors;
- funders;
- policy access.

### Design rule

Networking should produce weak short-term outcomes but strong option value and occasional nonlinear returns.

### Risks

- shallow network;
- overconcentration in one community;
- low-relevance relationships;
- reputation damage through opportunistic behavior.

---

## 8.7 Financial Capital Pipeline

### Stages

Compensation or revenue  
→ Savings  
→ Runway  
→ Optionality  
→ Higher-risk or higher-impact choices

### Outputs

- donation capacity;
- resilience;
- ability to retrain;
- ability to found;
- ability to accept lower compensation;
- reduced pressure to accept poor-fit roles.

### Design rule

Money is not the primary score. It is a strategic resource and one possible channel for impact.

### Risks

- lifestyle inflation;
- golden handcuffs;
- delayed transition into direct work;
- overestimating donation impact;
- concentration in unstable assets or industries.

---

# 9. Opportunity System

## 9.1 Opportunity Types

- jobs;
- internal projects;
- promotions;
- learning programs;
- side projects;
- collaborations;
- conferences;
- fellowships;
- grants;
- speaking invitations;
- advisory roles;
- founding opportunities;
- policy appointments;
- research programs;
- donation opportunities.

## 9.2 Opportunity Generation Inputs

Each opportunity is generated from:

- current stage;
- player profession and level;
- career capital;
- active pipelines;
- prior choices;
- cause knowledge;
- reputation;
- network;
- geography;
- financial runway;
- market conditions;
- random events.

## 9.3 Opportunity Attributes

Each opportunity has hidden or partially visible attributes:

- expected impact;
- probability of success;
- capability fit;
- personal fit;
- learning value;
- financial value;
- reputational value;
- option value;
- reversibility;
- time to payoff;
- downside risk;
- counterfactuality.

The player should receive qualitative signals rather than exact probabilities.

Example:

- Strong capability match
- Limited evidence
- High uncertainty
- Unusually strong learning potential
- Low financial runway required
- Crowded applicant pool
- Mission fit unclear

## 9.4 Opportunity Expiration

Some opportunities remain open across several turns. Others expire immediately.

Expiration forces prioritization but should not be overused.

## 9.5 Opportunity Quality Distribution

Most opportunities should be plausible but unexceptional.

A small number should be unusually attractive, unusually risky, or deceptively attractive.

---

# 10. Outcome Resolution

## 10.1 Outcome Function

An outcome is determined by:

1. player state;
2. Energy invested;
3. cumulative prior investment;
4. opportunity characteristics;
5. market and event modifiers;
6. hidden fit;
7. randomness.

## 10.2 Nonlinear Investment

More Energy should often improve success probability, but not linearly.

Example behavior:

- 1 Energy: superficial attempt;
- 3 Energy: credible effort;
- 5 Energy: strong effort;
- 8 Energy: near-maximum practical effort;
- 10 Energy: small additional gain, high opportunity cost.

This makes overinvestment possible.

## 10.3 Randomness

Randomness is required but should not dominate.

The same decision can produce different results across runs.

However, strong profiles and well-supported strategies should perform better over time.

## 10.4 Partial Outcomes

Many investments should yield partial value even when the primary goal fails.

Examples:

- rejected role produces an industry connection;
- failed project builds capability;
- unsuccessful public artifact improves writing skill;
- denied grant creates reusable proposal material;
- missed promotion increases external marketability.

## 10.5 Outcome Explanation

Each result should include a short causal breakdown.

Example:

> You reached the final interview but did not receive the offer. Your domain evidence was strong, and the referral helped you bypass the initial screen. The successful candidate had substantially more management experience.

The explanation should avoid revealing the full simulation model.

---

# 11. Events

Events are one-off external changes, similar to city events in a management simulation.

They are not player-managed loops.

## 11.1 Market Events

- recession;
- hiring boom;
- layoffs;
- funding contraction;
- AI breakthrough;
- regulatory shift;
- public-sector expansion;
- new philanthropic funding;
- cause-area scandal;
- technological disruption.

## 11.2 Organizational Events

- acquisition;
- leadership change;
- company failure;
- promotion freeze;
- major launch;
- internal restructuring;
- unexpected funding.

## 11.3 Personal Events

- relocation need;
- caregiving;
- illness;
- family expansion;
- visa constraint;
- financial emergency;
- unexpected inheritance;
- burnout.

## 11.4 Event Design Rules

Events should:

- alter trade-offs;
- create or close opportunities;
- test resilience and optionality;
- avoid becoming morality tests;
- be infrequent enough to remain meaningful;
- produce different effects depending on the player’s state.

---

# 12. High-Impact Career Framework

## 12.1 Cause Areas

The game may include broad cause domains such as:

- global health;
- global development;
- animal welfare;
- AI risk and governance;
- biosecurity;
- climate and energy;
- institutional decision-making;
- scientific progress;
- democratic resilience;
- poverty reduction;
- mental health;
- education;
- broad economic growth.

The initial version should include a limited number of cause areas with clearly differentiated opportunity structures.

## 12.2 Impact Channels

Players can generate impact through:

- direct work;
- research;
- entrepreneurship;
- operations;
- policy;
- advocacy;
- field building;
- talent allocation;
- grantmaking;
- donations;
- public communication;
- institution building.

## 12.3 Expected Impact

The game should not use one simplistic visible formula as the final truth.

Internally, expected impact may be modeled through:

- scale of the problem;
- tractability of the intervention;
- neglectedness;
- role leverage;
- probability of success;
- personal fit;
- counterfactual contribution;
- duration;
- spillovers;
- downside risk.

## 12.4 Epistemic Uncertainty

Impact estimates should have uncertainty ranges.

The finale should distinguish:

- estimated realized impact;
- expected future impact;
- uncertainty;
- possible downside;
- counterfactual contribution.

## 12.5 Value Pluralism

Players may choose or be assigned different ethical weightings.

Possible modes:

- effective altruist;
- broad social good;
- human welfare;
- sentient welfare;
- long-term future;
- balanced pluralist.

The MVP may use one default pluralist model while keeping the scoring architecture extensible.

---

# 13. Progression and Difficulty

## 13.1 Increasing Decision Scale

Difficulty grows through:

- longer delays;
- greater uncertainty;
- more irreversible decisions;
- more complex interactions;
- larger opportunity costs;
- fewer obviously relevant options.

## 13.2 Stage Transitions

At the end of each level, the player receives a retrospective.

### Level 1 retrospective

- strongest evidence produced;
- career capital gained;
- underused assets;
- missed near-term opportunities;
- available exploration paths.

### Level 2 retrospective

- paths tested;
- evidence of fit;
- options closed;
- options strengthened;
- emerging comparative advantage.

### Level 3 transition

The player selects or receives a limited set of leverage opportunities based on the previous 24 turns.

## 13.3 No Traditional XP Levels

The campaign stages are temporal and strategic, not power levels.

Career capital may grow, but the game should avoid RPG language such as “+20 leadership XP.”

---

# 14. Finale

The campaign ends after the twelfth annual turn, at approximately age 44.

The finale should present:

## 14.1 Career Timeline

A chronological map of:

- roles;
- projects;
- pivots;
- promotions;
- organizations;
- cause areas;
- major events;
- key choices.

## 14.2 Career Capital Summary

- capability;
- evidence;
- reputation;
- network;
- financial capital;
- influence;
- cause knowledge;
- demonstrated fit.

## 14.3 Impact Summary

- direct impact;
- donations;
- organizations influenced;
- people enabled;
- capital allocated;
- research or products produced;
- expected future impact;
- uncertainty range;
- major negative externalities.

## 14.4 Counterfactual Review

The game identifies several pivotal choices and shows plausible alternatives.

It should not claim certainty.

Example:

> Remaining in the higher-paid role probably increased donations but delayed your transition into policy. Given your later policy performance, the transition may have produced more direct impact if attempted two years earlier.

## 14.5 Career Archetype

The player receives a descriptive archetype based on behavior, such as:

- The Institution Builder
- The Specialist
- The Founder
- The Talent Multiplier
- The Earn-to-Give Operator
- The Public Intellectual
- The Policy Entrepreneur
- The Generalist Coordinator

Archetypes should be descriptive, not ranked.

---

# 15. Replayability

Replay value comes from:

- different starting profiles;
- different hidden fit;
- different market timelines;
- different cause landscapes;
- different random events;
- alternative ethical weightings;
- path-dependent opportunity generation;
- incomplete visibility into probabilities.

A replay should not produce identical opportunities in a different order.

---

# 16. Starting Profiles

## 16.1 Preset Profiles

The MVP should include several role-agnostic but concrete presets.

Examples:

- Software engineer at a large technology company
- Product manager at a scale-up
- Operations manager at a nonprofit
- Researcher completing a PhD
- Public-policy professional
- Management consultant
- Physician
- Startup founder after an initial failure

## 16.2 Resume-Based Profile

A later version may allow players to import a résumé or LinkedIn-like profile.

The system would infer:

- profession;
- seniority;
- skills;
- evidence;
- domain experience;
- network proxies;
- compensation range;
- plausible opportunities.

The resulting simulation must be framed as fictional and educational, not predictive career advice.

---

# 17. User Interface

## 17.1 Primary Screen

The main screen should contain:

- current age and time period;
- Energy remaining;
- outcome cards;
- active pipelines;
- new opportunities;
- concise career-capital snapshot;
- end-turn control.

## 17.2 Opportunity Card

Each card should show:

- action;
- Energy cost;
- expiration;
- qualitative fit indicators;
- expected time to outcome;
- primary possible benefits;
- major uncertainty.

## 17.3 Pipeline View

The player can inspect active pipelines, but should not manage them at a granular level.

Example:

> Senior Operations Role  
> Final interview pending  
> Next investment: 5 Energy  
> Strong mission fit · Moderate experience match · High competition

## 17.4 History

The game should preserve:

- prior investments;
- outcomes;
- state changes;
- causal links;
- key events.

This history supports the finale and allows the player to understand compounding.

---

# 18. Notifications

The product relies on daily return behavior.

Notifications should be limited to:

- new turn available;
- major outcome resolved;
- stage transition;
- finale available.

Avoid manipulative urgency, streak loss, or excessive reminders.

Missing a real day should not punish the player.

A missed session pauses the campaign.

---

# 19. Economy and Monetization

Monetization should not affect simulation outcomes.

Possible models:

- paid app;
- free first campaign, paid additional scenarios;
- subscription for new profiles and cause-area packs;
- institutional licenses for career programs;
- sponsored educational distribution.

Avoid:

- purchasable Energy;
- paid rerolls;
- probability boosts;
- streak protection;
- impact-score upgrades.

These mechanics would undermine the game’s educational premise.

---

# 20. MVP Scope

## 20.1 Included

- one 36-turn campaign;
- three campaign stages;
- 10 Energy per turn;
- repetition-cost and cooldown system;
- five starting profiles;
- four cause areas;
- seven persistent pipelines;
- approximately 120 opportunity templates;
- approximately 40 one-off events;
- qualitative opportunity signals;
- probabilistic outcome simulation;
- career timeline;
- final career-capital and impact report;
- local notifications;
- simple account and cloud save.

## 20.2 Simplifications

- no résumé import;
- no generative dialogue;
- no multiplayer;
- no social feed;
- no live labor-market data;
- no user-generated scenarios;
- no fully dynamic economic simulation;
- no exact real-world organization names;
- limited ethical weighting options;
- text-first presentation with restrained illustration.

## 20.3 Explicitly Excluded

- interview-question mini-games;
- recruiter conversations;
- salary negotiation screens;
- daily task execution;
- productivity tracking;
- real-world career recommendations presented as predictions;
- purchasable gameplay advantages.

---

# 21. Content Architecture

Game content should be stored as structured templates.

## 21.1 Opportunity Template

Fields:

- id;
- title;
- description;
- stage availability;
- profession tags;
- seniority range;
- cause tags;
- prerequisites;
- base Energy cost;
- repetition category;
- expiry;
- possible outcomes;
- delay distribution;
- impact attributes;
- career-capital effects;
- event modifiers;
- follow-up opportunities.

## 21.2 Event Template

Fields:

- id;
- event type;
- trigger conditions;
- probability;
- duration;
- affected opportunities;
- player-state modifiers;
- narrative text;
- downstream effects.

## 21.3 Outcome Template

Fields:

- primary outcome;
- partial outcomes;
- state changes;
- causal explanation;
- follow-up pipeline;
- uncertainty language.

---

# 22. Simulation State

Minimum player state:

- current turn;
- age;
- campaign stage;
- role;
- profession;
- seniority;
- compensation;
- savings;
- runway;
- career-capital dimensions;
- cause knowledge;
- cause preferences;
- hidden fit variables;
- action-fatigue levels;
- active pipelines;
- completed outcomes;
- market state;
- active events;
- cumulative impact;
- unresolved delayed effects.

---

# 23. Balancing Goals

A healthy simulation should produce the following:

- most players complete several pipelines but cannot pursue everything;
- high-Energy investments often outperform shallow investments, but overinvestment is inefficient;
- repeated actions become unattractive before becoming impossible;
- current-job investment is frequently valuable but not always optimal;
- public work and networking have delayed, nonlinear returns;
- learning works best when paired with application;
- financial capital creates strategic flexibility without dominating impact;
- exploration sometimes reveals poor fit;
- direct-impact paths can fail;
- earning-to-give can be effective but is not automatically optimal;
- later leverage reflects earlier accumulated capital;
- randomness changes outcomes without erasing strategy.

---

# 24. Product Metrics

## Engagement

- day-2 return;
- day-7 return;
- completion of Level 1;
- completion of Level 2;
- completion of full campaign;
- average session duration;
- notification opt-in;
- replay rate.

## Decision Quality Signals

- diversity of Energy allocation;
- frequency of all-in strategies;
- proportion of unused Energy;
- pipeline abandonment;
- cause-area switching;
- concentration of dominant strategies.

## Learning Signals

Measured through optional post-campaign questions:

- improved understanding of opportunity cost;
- recognition of delayed returns;
- understanding of career capital;
- increased consideration of personal fit;
- increased consideration of counterfactual impact;
- reduced belief in a single universally best career path.

## Content Health

- opportunity acceptance rates;
- outcome distribution;
- profile-specific win rates;
- pipeline completion rates;
- event frequency;
- impact-score variance;
- replay divergence.

---

# 25. Open Design Questions

1. Should every turn always provide exactly 10 Energy?
2. Should unused Energy disappear, provide recovery, or convert into a small resilience benefit?
3. How visible should personal fit be?
4. Should players select ethical priorities before the campaign or discover them through play?
5. How many cause areas can the MVP represent without flattening them?
6. Should the finale stop at age 44 or estimate the remaining career?
7. How strongly should real-world cause-prioritization frameworks influence scoring?
8. Should one campaign use a fixed world timeline or a procedural one?
9. How much negative impact and moral uncertainty should be modeled?
10. Should starting profiles be balanced, or intentionally unequal?
11. Can the simulation remain understandable without revealing numeric probabilities?
12. What tone should the game use: serious, lightly satirical, or neutral?
13. How should the game represent structural privilege and unequal access without overwhelming the core mechanic?
14. Should players be able to inspect alternative outcomes after completing a campaign?
15. How much educational explanation should appear during play versus only in the retrospective?

---

# 26. Recommended Prototype

The first playable prototype should cover only Level 1.

## Prototype content

- one starting profile;
- 12 monthly turns;
- 10 Energy;
- five action categories;
- hiring and current-employer pipelines;
- one learning pipeline;
- one project pipeline;
- 20–30 opportunity templates;
- 10 events;
- repetition cost;
- delayed outcomes;
- simple retrospective.

## Prototype question

> Does allocating scarce Energy across delayed, uncertain career investments create enough tension to support a daily-return game?

The prototype should validate the core allocation loop before building the full impact model or the later strategic stages.
