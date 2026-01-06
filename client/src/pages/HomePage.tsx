import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"

function HomePage() {
  return (
    <div className="relative min-h-screen bg-black">

      {/* MAIN CONTENT */}
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex w-full flex-col items-center justify-evenly gap-16 sm:flex-row">

          <div className="flex w-full animate-up-down justify-center sm:w-1/2">
            <img
              src={illustration}
              alt="Let's Code Illustration"
              className="mx-auto w-[250px] sm:w-[400px]"
            />
          </div>

          <div className="flex w-full items-center justify-center sm:w-1/2">
            <FormComponent />
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="absolute bottom-4 w-full text-center text-sm text-gray-400">
        © 2026–2030 Shrawan Kumar Jha
      </footer>

    </div>
  )
}

export default HomePage
