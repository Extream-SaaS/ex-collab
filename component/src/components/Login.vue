<template>
  <v-card
    class="mx-auto my-12"
    max-width="374"
  >
    <v-card-title>Login</v-card-title>
    <v-card-text>
      <validation-observer
        ref="observer"
        v-slot="{ invalid }"
      >
        <form @submit.prevent="submit">
          <validation-provider
            v-slot="{ errors }"
            name="Email"
            rules="required|email"
          >
            <v-text-field
              v-model="email"
              :error-messages="errors"
              label="Email"
              required
            ></v-text-field>
          </validation-provider>

          <v-btn
            class="mr-4"
            type="submit"
            :disabled="invalid"
          >
            sign-in
          </v-btn>
        </form>
      </validation-observer>
    </v-card-text>
  </v-card>
</template>
<script>
  import { required, email, max } from 'vee-validate/dist/rules'
  import { extend, ValidationObserver, ValidationProvider, setInteractionMode } from 'vee-validate'

  setInteractionMode('eager')

  extend('required', {
    ...required,
    message: '{_field_} can not be empty',
  })

  extend('max', {
    ...max,
    message: '{_field_} may not be greater than {length} characters',
  })

  extend('email', {
    ...email,
    message: 'Email must be valid',
  })

  export default {
    name: 'VLogin',
    components: {
      ValidationProvider,
      ValidationObserver,
    },
    data: () => ({
      email: '',
    }),

    methods: {
      submit () {
        this.$refs.observer.validate()
        this.$emit('login', {
          username: this.email
        })
      },
    },
  }
</script>
