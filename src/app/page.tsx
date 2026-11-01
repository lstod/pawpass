import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>PawPass</CardTitle>
          <CardDescription>Pass or Paws</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Is this weekend worth a ski day, or does the dog get it? The planner
            is on its way.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
