import { Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import MainLayout from "./components/MainLayout";
import Login from "./pages/Login";
import Gallery from "./pages/Gallery";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Shorts from "./pages/Shorts";
import Admin from "./pages/Admin";
import Audio from "./pages/Audio";
import AudioDetail from "./pages/AudioDetail";
import Images from "./pages/Images";
import ImageDetail from "./pages/ImageDetail";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import Web from "./pages/Web";
import WebDetail from "./pages/WebDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/videos" element={<Gallery />} />
        <Route path="/watch/:slug" element={<Watch />} />
        <Route path="/shorts/:slug" element={<Shorts />} />
        <Route path="/audio" element={<Audio />} />
        <Route path="/audio/:id" element={<AudioDetail />} />
        <Route path="/images" element={<Images />} />
        <Route path="/images/:id" element={<ImageDetail />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
        <Route path="/web" element={<Web />} />
        <Route path="/web/:slug" element={<WebDetail />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
