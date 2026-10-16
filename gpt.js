import { get_encoding } from "tiktoken";

const encodedForGpt2 = get_encoding("gpt2");

const encode=encodedForGpt2.encode("Hello I am Rawnak");

console.log(encode);

const deco=encodedForGpt2.decode(encode);

console.log(new TextDecoder().decode(deco));