<script lang="ts">
  import city from "./city.png";
  import hike from "./hike.png";
  import lived from "./lived.png";
  import ski from "./ski.png";

  let showPop = true;

  function show() {
    showPop = !showPop;
  }
</script>

<div class="info">
  <h1 on:click={show}>i</h1>
</div>

{#if showPop}
  <div on:click={show} class="content">
    <div class="wrapper">
      <div class="imgs">
        <div class="token">
          <p>Places I have lived</p>
          <img src={lived} alt="city token" />
        </div>
        <div class="token">
          <div class="token">
            <p>Places I have skied</p>
            <img src={ski} alt="city token" />
          </div>
          <p>Places I have been</p>
          <img src={city} alt="city token" />
        </div>
        <div class="token">
          <p>Mountains I have hiked</p>
          <img src={hike} alt="city token" />
        </div>
        <div class="token">
          <p>Places I have skied</p>
          <img src={ski} alt="city token" />
        </div>
        <div class="token">
          <o
            >Code on <a href="https://github.com/TheArctesian/world-blog"
              >Github</a
            ></o
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .content {
    position: fixed;
    z-index: 1001;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex; /* Add this line */
    justify-content: center; /* Add this line */
    align-items: center; /* Add this line */
  }
  .wrapper {
    background-color: #fefefe;
    margin: 15% auto;
    margin-top: auto;
    margin-bottom: auto;
    width: fit-content;
    height: fit-content;
    padding: 1rem;
    border: 0.4rem;
  }
  .imgs {
    display: flex;
    flex-direction: column;
    justify-content: space-between; /* Distributes space evenly between items */
    align-items: center;
  }
  .token {
    margin: auto;
    flex-direction: column;
    display: flex;
    justify-content: space-between; /* Distributes space evenly between items */
    align-items: center;
    padding: 0.4rem;
    margin: 0.2rem;
  }
  .info {
    position: absolute;
    right: 3%;
    top: 0%;
    z-index: 1000;
    background-color: white;
    padding: 0.1rem;
    margin-top: 1rem;
    border-radius: 50%; /* Making the div round */
    font-size: 0.7rem;
    width: 30px; /* Adding equal width and height */
    height: 30px; /* Adding equal width and height */
    display: flex; /* Centering the content */
    align-items: center; /* Centering the content */
    justify-content: center; /* Centering the content */
  }
  h1 {
    margin: auto;
  }
  img {
    height: 5rem;
    width: 5rem;
  }
</style>
