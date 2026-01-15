import { Github, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-nav mx-4 mt-4 rounded-2xl">
        <div className="container flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">E</span>
            </div>
            <span className="font-semibold text-foreground">Evergreeners</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Github className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            
            <div className="ml-2 w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden">
              <img
                src="https://avatars.githubusercontent.com/u/1?v=4"
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
