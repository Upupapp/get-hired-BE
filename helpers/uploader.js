import firebase from "firebase/compat";
import { firebaseConfig } from "../middleware/firebaseApp";

const uploadInStorage = (folder, fileName, uploadedFile) =>
  new Promise((resolve, reject) => {
    console.log("Uploading image ...");

    const img = uploadedFile.slice(uploadedFile.indexOf(",") + 1);
    const imgType = uploadedFile.slice(
      uploadedFile.indexOf(":") + 1,
      uploadedFile.indexOf(";")
    );

    const app = firebase.initializeApp(firebaseConfig);

    const uploadTask = app
      .storage()
      .ref(folder)
      .child(fileName)
      .putString(img, "base64", { contentType: imgType });

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.log(error);
        // An error occurred so inform the caller
        reject(error);
      },
      async () => {
        const imgURL = await uploadTask.snapshot.ref.getDownloadURL();
        console.log("uploaded image: " + imgURL);

        // We 'awaited' the imgURL, now resolve this Promise
        resolve(imgURL);
      }
    );
  });

export default uploadInStorage;