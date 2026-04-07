import React from "react";
import { toast } from "react-toastify";

function Contact() {
  return (
    <div className="flex p-10 items-center justify-center">         
        <div className="w-1/2 pl-12">
            <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
            <form action="contact">
                <input type="text" placeholder="Name" className="w-full p-3 border rounded mb-4" />
                <input type="email" placeholder="Email ID" className="w-full p-3 border rounded mb-4" />
                <textarea placeholder="Your Message" className="w-full p-3 border rounded mb-4 h-32"></textarea>
            </form>
            <button onClick={() => { toast.success("Message sent successfully!") }} className="bg-red-500 text-white px-6 py-2 rounded w-full mb-3">Send Message</button>
        </div>
    </div>
  );
}

export default Contact;
