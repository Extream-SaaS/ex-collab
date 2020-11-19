<template>
  <v-card>
    <v-card-title>Login</v-card-title>
    <v-card-text>
      <validation-observer
        ref="observer"
      >
        <v-form v-model="valid" @submit.prevent="submit">
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
            :disabled="!valid || loading"
            :loading="loading"
          >
            sign-in
          </v-btn>
        </v-form>
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
    props: {
      loading: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data: () => ({
      valid: true,
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
