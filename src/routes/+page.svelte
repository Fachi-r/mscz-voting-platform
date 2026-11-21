<script lang="ts">
  import { Eye, Lock, Zap } from "@lucide/svelte";
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";

  const steps = [
    {
      num: "1",
      title: "Accreditation",
      desc: "Verify your identity using your MCSZ-issued credentials or national ID.",
    },
    {
      num: "2",
      title: "Secure Ballot",
      desc: "Cast your vote in an encrypted, isolated session. No tracking, no coercion.",
    },
    {
      num: "3",
      title: "Audit Receipt",
      desc: "Receive a cryptographic verification code to independently verify your vote was counted.",
    },
  ];

  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      desc: "Votes are encrypted on the client device before transmission.",
    },
    {
      icon: Eye,
      title: "Transparent Auditing",
      desc: "Returning Officers can verify turnout without compromising voter anonymity.",
    },
    {
      icon: Zap,
      title: "Real-Time Turnout",
      desc: "Live, anonymized participation metrics for election administrators.",
    },
  ];
</script>

<svelte:head>
  <title>MCSZ Secure Voting Portal</title>
  <meta
    name="description"
    content="Official secure internal voting platform for the Media Self-Regulation Council of Zambia."
  />
</svelte:head>

<div class="flex min-h-screen flex-col bg-base-200 font-sans">
  <!-- Hero Section -->
  <div class="relative hero min-h-[70vh] overflow-hidden bg-base-200">
    <div
      class="absolute inset-0 bg-[radial-gradient(#444cf7_1px,transparent_1px)] bg-size-[20px_20px] opacity-[0.03]"
    ></div>

    <div class="relative hero-content z-10 px-4 text-center">
      <div class="max-w-3xl" in:fly={{ y: 30, duration: 800, easing: cubicOut }}>
        <div class="mb-6 badge badge-outline p-3 text-sm badge-secondary">
          Official Internal Elections Platform
        </div>
        <h1 class="mb-6 text-4xl leading-tight font-extrabold md:text-6xl">
          Secure, Transparent, and <span class="text-secondary">Auditable</span>
          Voting
        </h1>
        <p class="py-4 text-lg leading-relaxed text-base-content/70 md:text-xl">
          The official digital voting infrastructure for the <span
            class="font-semibold text-base-content"
            >Media Self-Regulation Council of Zambia (MCSZ)</span
          >. Ensuring integrity, anonymity, and accessibility for all accredited members.
        </p>
        <div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href="/elections" class="btn gap-2 shadow-lg shadow-secondary/20 btn-lg btn-secondary">
            🗳️ Cast Your Vote
          </a>
          <a href="/admin" class="btn gap-2 btn-outline btn-lg"> 🛡️ Administration Portal </a>
        </div>

        <div
          class="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-base-content/60"
        >
          <div class="flex items-center gap-2">
            <span class="text-lg text-success">●</span> End-to-End Encrypted
          </div>
          <div class="flex items-center gap-2">
            <span class="text-lg text-success">●</span> Anonymous Tallying
          </div>
          <div class="flex items-center gap-2">
            <span class="text-lg text-success">●</span> Verifiable Receipts
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- How It Works Section -->
  <div class="bg-base-100 px-4 py-20">
    <div class="mx-auto max-w-5xl">
      <h2 class="mb-12 text-center text-3xl font-bold md:text-4xl">How the Voting Process Works</h2>

      <ul class="steps steps-vertical w-full text-sm md:steps-horizontal md:text-base">
        {#each steps as step, i}
          <li class="step step-secondary" in:fly={{ y: 20, duration: 600, delay: i * 150 }}>
            <div class="mt-4 flex flex-col items-center gap-2 text-center md:mt-2">
              <div class="text-lg font-bold text-secondary">{step.title}</div>
              <p class="max-w-xs text-base-content/60">{step.desc}</p>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <!-- Security Features Grid -->
  <div class="border-t border-base-300 bg-base-200 px-4 py-20">
    <div class="mx-auto max-w-6xl">
      <h2 class="mb-12 text-center text-3xl font-bold md:text-4xl">
        Built for Electoral Integrity
      </h2>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        {#each features as feature}
          <div
            class="card border border-base-300 bg-base-100 shadow-md transition-shadow hover:shadow-xl"
          >
            <div class="card-body items-center text-center">
              <feature.icon size={32} class="mb-2 text-secondary" />
              <h3 class="card-title text-primary">{feature.title}</h3>
              <p class="text-sm text-base-content/70">{feature.desc}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="mt-auto footer footer-center bg-base-300 p-10 text-base-content">
    <aside>
      <p class="text-lg font-bold">Media Self-Regulation Council of Zambia</p>
      <p class="max-w-md text-base-content/60">
        Promoting ethical journalism and self-regulation in the Zambian media landscape. This
        platform is for internal, accredited use only.
      </p>
    </aside>
    <nav class="mt-4 grid grid-flow-col gap-6 text-sm">
      <a href="/privacy" class="link link-hover">Privacy Policy</a>
      <a href="/electoral-guidelines" class="link link-hover">Electoral Guidelines</a>
      <a href="mailto:support@mcsz.org.zm" class="link link-hover">Technical Support</a>
    </nav>
    <aside class="mt-6 text-xs text-base-content/40">
      © {new Date().getFullYear()} MCSZ. All rights reserved. Secured by SvelteKit & Web Crypto API.
    </aside>
  </footer>
</div>
