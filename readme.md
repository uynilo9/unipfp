# Unipfp

> [!WARNING]
> This script is still under development and only for personal use.

## ✨ Overview

This is a simple script written in TypeScript that updates your social media pfps uniformly and automatically.


## 📦 Preparation

1. Clone the repository:
```sh
git clone https://github.com/uynilo9/unipfp.git
cd unipfp
```

2. Install the dependencies:
```sh
deno install
```

3. Rename the `.env.example` file to `.env` and fill in the fields.

4. Specify the pfp file name in the `main.ts` file.
```ts
const img = "path/to/your/pfp.jpg";
```


## 📜 Usage

1. Comment unused platforms in the `main.ts` file:
```ts
// const github = await updatePfpViaBrowser(browser.value, GitHub);
// if (github.type === "err") {
// 	throw github.error;
// }
```

2. Run the script:

```sh
deno run start
```


## ⚖️ License

MIT License
