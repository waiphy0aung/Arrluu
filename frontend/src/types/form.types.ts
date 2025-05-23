export interface SignUpFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginFormState {
  email: string;
  password: string;
}

export interface ProfileFormState {
  profilePic: string;
}

export interface MessageFormState {
  text: string;
  image?: string;
}
