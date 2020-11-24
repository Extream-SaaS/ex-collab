<template>
  <v-card>
    <v-card-title>{{ action }}</v-card-title>
    <v-card-text>
      <v-container v-if="regError">
        <v-row dense>
          <v-col>
            <p>{{ regError }}</p>
          </v-col>
        </v-row>
      </v-container>
      <v-container v-else-if="loginError">
        <v-row dense>
          <v-col>
            <p>{{ loginError }}</p>
          </v-col>
        </v-row>
      </v-container>
      <validation-observer
        v-else-if="register && userInvited"
        ref="register"
        v-slot="{ invalid }"
        :key="'register'"
      >
        <v-form @submit.prevent="userSubmit">
          <validation-provider
            v-slot="{ errors }"
            name="Display name"
            rules="required"
            :key="'username'"
          >
            <v-text-field
              v-model="attendee.username"
              :error-messages="errors"
              label="Display name"
              required
            ></v-text-field>
          </validation-provider>
          <validation-provider
            v-slot="{ errors }"
            name="First name"
            rules="required"
            :key="'firstName'"
          >
            <v-text-field
              v-model="attendee.firstName"
              :error-messages="errors"
              label="First name"
              required
            ></v-text-field>
          </validation-provider>
          <validation-provider
            v-slot="{ errors }"
            name="Last name"
            rules="required"
            :key="'lastName'"
          >
            <v-text-field
              v-model="attendee.lastName"
              :error-messages="errors"
              label="Last name"
              required
            ></v-text-field>
          </validation-provider>
          <validation-provider
            v-slot="{ errors }"
            name="Email"
            rules="required|email"
            :key="'email'"
          >
            <v-text-field
              v-model="attendee.email"
              :error-messages="errors"
              label="Email"
              required
            ></v-text-field>
          </validation-provider>
          <v-btn
            class="mr-4"
            type="submit"
            :disabled="invalid || loading"
            :loading="loading"
          >
            submit
          </v-btn>
        </v-form>
      </validation-observer>
      <v-container v-else-if="userNotFound">
        <v-row dense>
          <v-col>
            <p>Unfortunately this service is by invitation only.<br />Please follow an invitation link to join.</p>
          </v-col>
        </v-row>
      </v-container>
      <validation-observer
        v-else
        ref="login"
        v-slot="{ invalid }"
        :key="'login'"
      >
        <v-form @submit.prevent="submit">
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
            :disabled="invalid || loading"
            :loading="loading"
          >
            submit
          </v-btn>
        </v-form>
      </validation-observer>
    </v-card-text>
  </v-card>
</template>
<script>
  import { required, email, max } from 'vee-validate/dist/rules'
  import { extend, ValidationObserver, ValidationProvider, setInteractionMode } from 'vee-validate'

  setInteractionMode('aggressive')

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
      register: {
        type: Boolean,
        required: false,
        default: false,
      },
      userInvited: {
        type: Boolean,
        required: false,
        default: false,
      },
      userNotFound: {
        type: Boolean,
        required: false,
        default: false,
      },
      invitedId: {
        type: String,
        required: false,
        default: '',
      },
      regError: {
        type: String,
        required: false,
        default: '',
      },
      loginError: {
        type: String,
        required: false,
        default: '',
      },
    },
    data: () => ({
      valid: true,
      email: '',
      attendee: {
        id: '',
        username: '',
        firstName: '',
        lastName: '',
        email: '',
      }
    }),
    computed: {
      action() {
        return this.userInvited && this.register ? 'Enter your details' : this.userNotFound ? 'Invitational access only' : 'Login'
      },
    },
    watch: {
      invitedId(newVal, oldVal) {
        if (newVal !== '' && newVal !== oldVal) {
          this.attendee.id = newVal
        }
      }
    },
    methods: {
      submit () {
        this.$refs.login.validate()
        this.$emit('login', {
          username: this.email
        })
        this.attendee.email = this.email
      },
      userSubmit() {
        this.$refs.register.validate()
        this.$emit('register', this.attendee)
      },
    },
  }
</script>
