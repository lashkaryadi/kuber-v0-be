// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";
// dotenv.config();
// import process from "process";

// const generateToken = (user) => {
//   return jwt.sign(
//     {
//       id: user._id,      // 🔥 THIS IS THE KEY FIX
//       role: user.role,   // optional but useful
//     },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: "30d",
//     }
//   );
// };

// export default generateToken;
