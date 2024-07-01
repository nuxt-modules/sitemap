<script setup lang="ts"></script>

<template>
  <div>
    Pre-render Video Discovery Page

    <!-- Control Video with src, should auto-discover -->
    <video
      controls
      src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
      poster="https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg"
      width="620"
      data-title="Big Buck Bunny"
      data-description="Big Buck Bunny in DivX 720p."
    >
      Sorry, your browser doesn't support embedded videos, but don't worry, you
      can
      <a href="https://archive.org/details/BigBuckBunny_124">download it</a>
      and watch it with your favorite video player!
    </video>

    <!-- Control Video with source, should auto-discover -->
    <video
      controls
      poster="https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg"
      width="620"
      data-title="Duck and Cover"
      data-description="This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack."
    >
      <source
        src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4"
        type="video/mp4"
      >
      <source
        src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi"
        type="video/x-msvideo"
      >
      Sorry, your browser doesn't support embedded videos, but don't worry, you
      can
      <a href="https://archive.org/details/DuckAndCover_185">download it</a>
      and watch it with your favorite video player!
    </video>
  </div>
</template>
