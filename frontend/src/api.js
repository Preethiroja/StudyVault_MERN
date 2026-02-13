import axios from "axios";

export const api = axios.create({
  baseURL: "https://studyvault-mern.onrender.com/api"
});
