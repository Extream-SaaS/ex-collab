<template>
  <v-card>
    <v-card-title>{{ roomAction }}</v-card-title>
    <v-card-text>
      <v-container v-if="loading" fluid>
        <v-row dense>
          <v-col>
            <v-progress-circular
              indeterminate
            ></v-progress-circular>
          </v-col>
        </v-row>
      </v-container>
      <v-container v-else-if="showChoice" fluid>
        <v-row dense>
          <v-col>
            <v-card>
              <v-card-title>Join an existing meeting</v-card-title>
              <v-card-text>
                <v-btn @click="existingMeeting" text>Enter your meeting pin</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col>
            <v-card>
              <v-card-title>Create a new meeting</v-card-title>
              <v-card-text>
                <v-btn @click="newMeeting" text>Enter meeting details</v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <validation-observer v-else-if="createMeeting"
        ref="create"
        v-slot="{ invalid }"
        :key="'create'"
      >
        <v-form @submit.prevent="createSubmit">
          <validation-provider
            v-slot="{ errors }"
            name="Title"
            rules="required"
            :key="'title'"
          >
            <v-text-field
              v-model="create.title"
              :error-messages="errors"
              label="Title"
              required
            ></v-text-field>
          </validation-provider>
          <validation-provider
            v-slot="{ errors }"
            name="Participants"
            rules="required|email"
            :key="'participants'"
          >
            <v-combobox
              v-model="create.emails"
              :error-messages="errors"
              :items="addressBook"
              append-icon=""
              label="Participants"
              multiple
              chips
              deletable-chips
              :delimiters="[',', ';', ' ']"
              type="email"
            ></v-combobox>
          </validation-provider>
          <v-btn
            class="mr-4"
            type="submit"
            :disabled="invalid || loading"
            :loading="loading"
          >
            create
          </v-btn>
          <v-btn @click="back">
            back
          </v-btn>
        </v-form>
      </validation-observer>
      <validation-observer v-else-if="joinMeeting"
        ref="join"
        v-slot="{ invalid }"
        :key="'join'"
      >
        <v-form @submit.prevent="joinSubmit">
          <validation-provider
            v-slot="{ errors }"
            name="Meeting Pin"
            rules="required"
            :key="'meetingPin'"
          >
            <v-text-field
              v-model="join.pin"
              :error-messages="errors"
              label="Meeting Pin"
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
          <v-btn @click="back">
            back
          </v-btn>
        </v-form>
      </validation-observer>
      <validation-observer v-else-if="userForm"
        ref="user"
        v-slot="{ invalid }"
        :key="'user'"
      >
        <v-form @submit.prevent="userSubmit">
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
          <v-btn @click="back">
            back
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
    components: {
      ValidationProvider,
      ValidationObserver,
    },
    props: {
      view: {
        type: String,
        required: false,
        default: 'choice',
      },
      loading: {
        type: Boolean,
        required: false,
        default: false,
      },
      roomId: {
        type: String,
        required: false,
        default: '',
      },
      roomAction: {
        type: String,
        required: false,
        default: '',
      },
    },
    data: () => ({
      showChoice: true,
      createMeeting: false,
      joinMeeting: false,
      userForm: false,
      addressBook: [],
      create: {
        title: '',
        emails: [],
      },
      join: {
        pin: '',
      },
      meeting: {
        pin: '',
      },
      attendee: {
        firstName: '',
        lastName: '',
        email: '',
      },
    }),
    mounted() {
      this.showChoice = this.view === 'choice'
      this.userForm = this.view === 'register'
    },
    methods: {
      joinSubmit() {
        this.submit('join')
        this.$emit('join', this.join)
      },
      createSubmit() {
        this.submit('create')
        this.$emit('create', this.create)
      },
      userSubmit() {
        this.submit('register')
        this.$emit('register', {
          attendee: this.attendee,
          roomId: this.roomId,
        })
      },
      submit (form) {
        console.log('submit', form)
        this.$refs[form].validate()
        this.showChoice = false
        this.joinMeeting = false
        this.createMeeting = false
      },
      back() {
        this.$emit('choice', '')
        this.create.title = ''
        this.create.emails = []
        this.join.pin = ''
        this.showChoice = true
        this.userForm = false
        this.joinMeeting = false
        this.createMeeting = false
      },
      existingMeeting() {
        this.$emit('choice', 'join')
        this.showChoice = false
        this.joinMeeting = true
        this.createMeeting = false
      },
      newMeeting() {
        this.$emit('choice', 'create')
        this.showChoice = false
        this.joinMeeting = false
        this.createMeeting = true
      },
    },
  }
</script>
