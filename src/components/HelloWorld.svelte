<script>
  let registrationStatus = 'initial'
  let data = null

  async function registerCb () {
    registrationStatus = 'pending'

    try {
      const res = await fetch('http://localhost:16557/register', {method: 'POST'})

      if (res.ok) {
        registrationStatus = 'registered'
      }
    } catch (err) {
      registrationStatus = 'failed'
    }
  }

  async function getDataCb () {
    data = 'Loading data...'

    try {
      const res = await fetch('http://localhost:16557')
      const resData = await res.json()
      data = resData
    } catch (err) {
      data = 'Error fetching data'
    }
  }
</script>

<style type="text/postcss">
  .button {
    @apply bg-blue-700 text-white font-bold py-2 px-4 rounded;
  }
</style>

<div class="flex flex-col items-center justify-center h-screen bg-gray-200">
  <div class="flex flex-col items-center justify-around h-56">

  <p>Registration status: {registrationStatus}</p>
  <p>Data: {JSON.stringify(data, null, 2)}</p>
  <br/>
  <button class="button w-40" on:click={registerCb}>Register</button>
  <button class="button w-40" on:click={getDataCb}>Get Data</button>
  </div>
</div>
