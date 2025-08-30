# Quiz Night! 🥳

This is a real-time, interactive web-based quiz application built with **React** and **Firebase**. It uses **Node.js** as the development environment and build tool.

## Features

* **Real-time updates:** The leaderboard and questions update instantly using Firebase.
* **Component-based UI:** The user interface is built with reusable React components for maintainability and scalability.
* **Separate Views:** Distinct interfaces for players and the quiz master.
* **Mobile-First Design:** The layout is optimized for mobile devices.

## Technologies Used

* **React:** For building the user interface.
* **Node.js:** The JavaScript runtime environment used for project management and the build process.
* **Firebase Realtime Database:** For real-time data synchronization.
* **Firebase Hosting:** To host the web application for free.

## How to Set Up and Run

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/YOUR-USERNAME/quiz-night.git](https://github.com/YOUR-USERNAME/quiz-night.git)
    cd quiz-night
    ```

2.  **Install dependencies:**
    This command will read the `package.json` file and install all necessary libraries into the `node_modules` folder.
    ```bash
    npm install
    ```

3.  **Set up a Firebase Project:**
    * Create a new project in the Firebase Console.
    * Set up a **Realtime Database** and enable it in "test mode".
    * Register a new web app to get your `firebaseConfig` object.

4.  **Add Firebase Configuration:**
    * Open `src/index.js` and replace the placeholder `firebaseConfig` object with your actual configuration from the Firebase Console.

5.  **Run the application locally (for development):**
    This command starts a development server on your machine.
    ```bash
    npm start
    ```

6.  **Build for production and deploy with Firebase:**
    * First, build the optimized production files:
        ```bash
        npm run build
        ```
    * Now, you can deploy the contents of the `build` folder (which corresponds to our `public` folder for this example) using the Firebase CLI. If you've already run `firebase init`, you can simply run:
        ```bash
        firebase deploy --only hosting
        ```

Enjoy your quiz night!